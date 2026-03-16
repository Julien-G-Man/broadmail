"""ARQ worker for processing campaign email sends."""
import re
import uuid
from datetime import datetime, timezone

import structlog
from arq import cron
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.campaigns.models import Campaign, CampaignRecipient
from app.contacts.models import Contact
from app.templates.models import EmailTemplate
from app.sending.dispatcher import send_batch_with_fallback
from app.sending.provider import EmailMessage
from app.templates.service import render_template_with_context
from app.analytics.service import record_event

logger = structlog.get_logger()

BATCH_SIZE = 50  # Never exceed 50


def chunked(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def inject_tracking_pixel(html: str, campaign_id: str, contact_id: str) -> str:
    pixel_url = (
        f"{settings.TRACKING_BASE_URL}track/open"
        f"?c={campaign_id}&r={contact_id}"
    )
    pixel = f'<img src="{pixel_url}" width="1" height="1" style="display:none" />'
    if "</body>" in html:
        return html.replace("</body>", f"{pixel}</body>")
    return html + pixel


def wrap_links(html: str, campaign_id: str, contact_id: str) -> str:
    """Replace every <a href="..."> with a click-tracking redirect URL."""
    from app.core.security import create_tracking_token

    def replace_href(match: re.Match) -> str:
        original_url = match.group(1)
        # Don't wrap the unsubscribe link or mailto/tel links
        if original_url.startswith(("mailto:", "tel:", "#")):
            return match.group(0)
        if "unsubscribe" in original_url:
            return match.group(0)
        token = create_tracking_token(
            {"campaign_id": campaign_id, "contact_id": contact_id, "url": original_url},
            expire_minutes=60 * 24 * 90,  # 90 days
        )
        redirect_url = f"{settings.TRACKING_BASE_URL}track/click/{token}"
        return f'href="{redirect_url}"'

    return re.sub(r'href="([^"]+)"', replace_href, html)


def inject_unsubscribe_link(html: str, contact_id: str) -> str:
    from app.core.security import create_unsubscribe_token
    token = create_unsubscribe_token(contact_id)
    unsub_url = f"{settings.TRACKING_BASE_URL}unsubscribe/{token}"
    unsub_html = (
        f'<div style="text-align:center;padding:20px;font-size:12px;color:#999">'
        f'<a href="{unsub_url}" style="color:#999">Unsubscribe</a>'
        f'</div>'
    )
    if "</body>" in html:
        return html.replace("</body>", f"{unsub_html}</body>")
    return html + unsub_html


async def process_campaign(ctx, campaign_id: str):
    """ARQ job. Pulls pending recipients in batches of 50 and sends."""
    log = logger.bind(campaign_id=campaign_id)
    log.info("processing_campaign_start")

    async with AsyncSessionLocal() as db:
        try:
            # Load campaign
            result = await db.execute(
                select(Campaign).where(Campaign.id == uuid.UUID(campaign_id))
            )
            campaign = result.scalar_one_or_none()
            if not campaign:
                log.error("campaign_not_found")
                return

            if campaign.status not in ("queued", "sending"):
                log.warning("campaign_status_skip", status=campaign.status)
                return

            # Load template
            template_result = await db.execute(
                select(EmailTemplate).where(EmailTemplate.id == campaign.template_id)
            )
            template = template_result.scalar_one_or_none()
            if not template:
                campaign.status = "failed"
                campaign.error_message = "Template not found"
                await db.commit()
                return

            # Update status to sending
            campaign.status = "sending"
            campaign.started_at = datetime.now(timezone.utc)
            await db.flush()

            # Load pending recipients (idempotent: skip already sent)
            recipients_result = await db.execute(
                select(CampaignRecipient).where(
                    CampaignRecipient.campaign_id == campaign.id,
                    CampaignRecipient.status == "pending",
                )
            )
            recipients = recipients_result.scalars().all()
            log.info("recipients_loaded", count=len(recipients))

            for batch in chunked(recipients, BATCH_SIZE):
                messages = []
                batch_recipients = []

                for r in batch:
                    # Load contact
                    contact_result = await db.execute(
                        select(Contact).where(Contact.id == r.contact_id)
                    )
                    contact = contact_result.scalar_one_or_none()

                    if not contact or contact.is_suppressed:
                        r.status = "skipped"
                        r.processed_at = datetime.now(timezone.utc)
                        continue

                    # Render template
                    context = {
                        "first_name": contact.first_name or "",
                        "last_name": contact.last_name or "",
                        "email": contact.email,
                        **contact.custom_fields,
                    }
                    rendered = render_template_with_context(template, context)

                    # Inject tracking
                    html = inject_tracking_pixel(rendered.html, campaign_id, str(contact.id))
                    html = wrap_links(html, campaign_id, str(contact.id))
                    html = inject_unsubscribe_link(html, str(contact.id))

                    msg = EmailMessage(
                        to_email=contact.email,
                        to_name=f"{contact.first_name or ''} {contact.last_name or ''}".strip(),
                        from_email=campaign.from_email,
                        from_name=campaign.from_name,
                        reply_to=campaign.reply_to or campaign.from_email,
                        subject=rendered.subject,
                        html=html,
                        text=rendered.text,
                        campaign_id=campaign_id,
                        contact_id=str(contact.id),
                    )
                    messages.append(msg)
                    batch_recipients.append(r)

                if not messages:
                    await db.flush()
                    continue

                results = await send_batch_with_fallback(messages)

                for r, result in zip(batch_recipients, results):
                    r.status = "sent" if result.success else "failed"
                    r.provider_id = result.provider_id
                    r.error = result.error
                    r.processed_at = datetime.now(timezone.utc)

                    if result.success:
                        await record_event(
                            db,
                            campaign_id=campaign.id,
                            contact_id=r.contact_id,
                            event_type="sent",
                        )

                await db.flush()

            campaign.status = "sent"
            campaign.completed_at = datetime.now(timezone.utc)
            await db.commit()
            log.info("campaign_complete")

        except Exception as e:
            log.error("campaign_error", error=str(e))
            try:
                campaign.status = "failed"
                campaign.error_message = str(e)
                await db.commit()
            except Exception:
                pass
            raise


async def startup(ctx):
    pass


async def shutdown(ctx):
    pass


class WorkerSettings:
    functions = [process_campaign]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = None  # Set dynamically

    @classmethod
    def get_settings(cls):
        import arq
        cls.redis_settings = arq.connections.RedisSettings.from_dsn(settings.REDIS_URL)
        return cls

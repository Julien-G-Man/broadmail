import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.models import EmailEvent
from app.campaigns.models import Campaign, CampaignRecipient
from app.contacts.models import Contact


async def record_event(
    db: AsyncSession,
    campaign_id: uuid.UUID | None,
    contact_id: uuid.UUID | None,
    event_type: str,
    url: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    provider_event_id: str | None = None,
) -> EmailEvent | None:
    # Deduplicate by provider_event_id
    if provider_event_id:
        existing = await db.execute(
            select(EmailEvent).where(EmailEvent.provider_event_id == provider_event_id)
        )
        if existing.scalar_one_or_none():
            return None

    event = EmailEvent(
        campaign_id=campaign_id,
        contact_id=contact_id,
        event_type=event_type,
        url=url,
        ip_address=ip_address,
        user_agent=user_agent,
        provider_event_id=provider_event_id,
    )
    db.add(event)
    await db.flush()
    return event


async def get_contact_events(db: AsyncSession, contact_id: uuid.UUID) -> list[EmailEvent]:
    result = await db.execute(
        select(EmailEvent)
        .where(EmailEvent.contact_id == contact_id)
        .order_by(EmailEvent.occurred_at.desc())
    )
    return result.scalars().all()


async def get_overview_stats(db: AsyncSession) -> dict:
    total_contacts = (await db.execute(select(func.count(Contact.id)))).scalar_one()
    total_campaigns = (await db.execute(select(func.count(Campaign.id)))).scalar_one()

    sent_result = await db.execute(
        select(func.count(EmailEvent.id)).where(EmailEvent.event_type == "sent")
    )
    total_sent = sent_result.scalar_one()

    opened_result = await db.execute(
        select(func.count(EmailEvent.id)).where(EmailEvent.event_type == "opened")
    )
    total_opened = opened_result.scalar_one()

    clicked_result = await db.execute(
        select(func.count(EmailEvent.id)).where(EmailEvent.event_type == "clicked")
    )
    total_clicked = clicked_result.scalar_one()

    # Recent campaigns
    recent_result = await db.execute(
        select(Campaign).order_by(Campaign.created_at.desc()).limit(5)
    )
    recent = recent_result.scalars().all()

    return {
        "total_contacts": total_contacts,
        "total_campaigns": total_campaigns,
        "total_sent": total_sent,
        "overall_open_rate": round(total_opened / total_sent, 4) if total_sent > 0 else 0.0,
        "overall_click_rate": round(total_clicked / total_sent, 4) if total_sent > 0 else 0.0,
        "recent_campaigns": [
            {
                "id": str(c.id),
                "name": c.name,
                "status": c.status,
                "total_recipients": c.total_recipients,
                "created_at": c.created_at.isoformat(),
            }
            for c in recent
        ],
    }

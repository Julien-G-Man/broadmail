import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.campaigns.models import Campaign, CampaignRecipient
from app.campaigns.schemas import CampaignCreate, CampaignUpdate, CampaignStats
from app.contacts.models import Contact, ContactListMembership


async def create_campaign(db: AsyncSession, data: CampaignCreate, created_by: uuid.UUID) -> Campaign:
    campaign = Campaign(
        name=data.name,
        from_name=data.from_name,
        from_email=data.from_email.lower(),
        reply_to=data.reply_to,
        template_id=data.template_id,
        list_ids=data.list_ids,
        created_by=created_by,
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    return campaign


async def list_campaigns(db: AsyncSession) -> list[Campaign]:
    result = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
    return result.scalars().all()


async def get_campaign(db: AsyncSession, campaign_id: uuid.UUID) -> Campaign | None:
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    return result.scalar_one_or_none()


async def update_campaign(db: AsyncSession, campaign: Campaign, data: CampaignUpdate) -> Campaign:
    if campaign.status != "draft":
        raise ValueError("Only draft campaigns can be edited")
    if data.name is not None:
        campaign.name = data.name
    if data.from_name is not None:
        campaign.from_name = data.from_name
    if data.from_email is not None:
        campaign.from_email = str(data.from_email).lower()
    if data.reply_to is not None:
        campaign.reply_to = data.reply_to
    if data.template_id is not None:
        campaign.template_id = data.template_id
    if data.list_ids is not None:
        campaign.list_ids = data.list_ids
    await db.flush()
    await db.refresh(campaign)
    return campaign


async def delete_campaign(db: AsyncSession, campaign: Campaign) -> None:
    if campaign.status not in ("draft", "failed", "cancelled"):
        raise ValueError("Only draft, failed, or cancelled campaigns can be deleted")
    await db.delete(campaign)
    await db.flush()


async def enqueue_campaign(db: AsyncSession, campaign: Campaign) -> Campaign:
    if campaign.status not in ("draft", "scheduled"):
        raise ValueError(f"Cannot send campaign with status '{campaign.status}'")
    campaign.status = "queued"
    campaign.scheduled_at = None
    await db.flush()
    await db.refresh(campaign)
    return campaign


async def schedule_campaign(
    db: AsyncSession, campaign: Campaign, scheduled_at: datetime
) -> Campaign:
    if campaign.status != "draft":
        raise ValueError("Only draft campaigns can be scheduled")
    campaign.status = "scheduled"
    campaign.scheduled_at = scheduled_at
    await db.flush()
    await db.refresh(campaign)
    return campaign


async def cancel_campaign(db: AsyncSession, campaign: Campaign) -> Campaign:
    if campaign.status != "scheduled":
        raise ValueError("Only scheduled campaigns can be cancelled")
    campaign.status = "cancelled"
    await db.flush()
    await db.refresh(campaign)
    return campaign


async def prepare_recipients(db: AsyncSession, campaign: Campaign) -> int:
    """Build campaign_recipients from all contacts in target lists (excluding suppressed)."""
    # Get unique contact IDs from all target lists
    result = await db.execute(
        select(ContactListMembership.contact_id)
        .where(ContactListMembership.list_id.in_(campaign.list_ids))
        .distinct()
    )
    contact_ids = [row[0] for row in result.fetchall()]

    # Load non-suppressed contacts
    contacts_result = await db.execute(
        select(Contact).where(
            Contact.id.in_(contact_ids),
            Contact.is_suppressed == False,
        )
    )
    contacts = contacts_result.scalars().all()

    # Delete existing pending recipients
    existing = await db.execute(
        select(CampaignRecipient).where(
            CampaignRecipient.campaign_id == campaign.id,
            CampaignRecipient.status == "pending",
        )
    )
    for r in existing.scalars().all():
        await db.delete(r)

    for contact in contacts:
        recipient = CampaignRecipient(
            campaign_id=campaign.id,
            contact_id=contact.id,
            email=contact.email,
        )
        db.add(recipient)

    campaign.total_recipients = len(contacts)
    await db.flush()
    return len(contacts)


async def get_campaign_stats(db: AsyncSession, campaign_id: uuid.UUID) -> CampaignStats:
    from app.analytics.models import EmailEvent

    # Recipient status counts
    result = await db.execute(
        select(CampaignRecipient.status, func.count(CampaignRecipient.id))
        .where(CampaignRecipient.campaign_id == campaign_id)
        .group_by(CampaignRecipient.status)
    )
    status_counts = dict(result.fetchall())

    # Event counts
    event_result = await db.execute(
        select(EmailEvent.event_type, func.count(EmailEvent.id))
        .where(EmailEvent.campaign_id == campaign_id)
        .group_by(EmailEvent.event_type)
    )
    event_counts = dict(event_result.fetchall())

    sent = status_counts.get("sent", 0)
    opened = event_counts.get("opened", 0)
    clicked = event_counts.get("clicked", 0)

    return CampaignStats(
        total_recipients=sum(status_counts.values()),
        sent=sent,
        failed=status_counts.get("failed", 0),
        skipped=status_counts.get("skipped", 0),
        pending=status_counts.get("pending", 0),
        delivered=event_counts.get("delivered", 0),
        opened=opened,
        clicked=clicked,
        bounced=event_counts.get("bounced", 0),
        unsubscribed=event_counts.get("unsubscribed", 0),
        open_rate=round(opened / sent, 4) if sent > 0 else 0.0,
        click_rate=round(clicked / sent, 4) if sent > 0 else 0.0,
    )


async def list_recipients(
    db: AsyncSession,
    campaign_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    status: str | None = None,
) -> tuple[list[CampaignRecipient], int]:
    query = select(CampaignRecipient).where(CampaignRecipient.campaign_id == campaign_id)
    if status:
        query = query.where(CampaignRecipient.status == status)

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all(), total

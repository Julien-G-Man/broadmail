import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.analytics.service import record_event
from app.contacts.models import Contact
from app.contacts.service import suppress_contact


async def handle_bounce(db: AsyncSession, email: str, campaign_id: str | None, provider_event_id: str | None):
    result = await db.execute(select(Contact).where(Contact.email == email.lower()))
    contact = result.scalar_one_or_none()
    if contact:
        await suppress_contact(db, contact, "bounce")
        await record_event(
            db,
            campaign_id=uuid.UUID(campaign_id) if campaign_id else None,
            contact_id=contact.id,
            event_type="bounced",
            provider_event_id=provider_event_id,
        )


async def handle_complaint(db: AsyncSession, email: str, campaign_id: str | None, provider_event_id: str | None):
    result = await db.execute(select(Contact).where(Contact.email == email.lower()))
    contact = result.scalar_one_or_none()
    if contact:
        await suppress_contact(db, contact, "complaint")
        await record_event(
            db,
            campaign_id=uuid.UUID(campaign_id) if campaign_id else None,
            contact_id=contact.id,
            event_type="complained",
            provider_event_id=provider_event_id,
        )


async def handle_delivery(db: AsyncSession, email: str, campaign_id: str | None, provider_event_id: str | None):
    result = await db.execute(select(Contact).where(Contact.email == email.lower()))
    contact = result.scalar_one_or_none()
    if contact:
        await record_event(
            db,
            campaign_id=uuid.UUID(campaign_id) if campaign_id else None,
            contact_id=contact.id,
            event_type="delivered",
            provider_event_id=provider_event_id,
        )

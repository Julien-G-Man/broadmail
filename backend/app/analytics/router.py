import hmac
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.config import settings
from app.core.security import decode_tracking_token, decode_unsubscribe_token
from app.analytics.service import record_event, get_overview_stats
from app.contacts.service import suppress_contact, get_contact
from app.contacts.models import Contact
from sqlalchemy import select
from jose import JWTError
import uuid

router = APIRouter(tags=["analytics"])

# 1x1 transparent GIF
TRANSPARENT_GIF = bytes([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61,  # GIF89a
    0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
    0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00,
    0x21, 0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0x02, 0x02, 0x44, 0x01, 0x00,
    0x3B
])


@router.get("/api/analytics/overview")
async def overview_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    return await get_overview_stats(db)


@router.get("/track/open")
async def track_open(
    c: str = Query(...),
    r: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        await record_event(
            db,
            campaign_id=uuid.UUID(c),
            contact_id=uuid.UUID(r),
            event_type="opened",
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )
        await db.commit()
    except Exception:
        pass
    return Response(content=TRANSPARENT_GIF, media_type="image/gif")


@router.get("/track/click/{token}")
async def track_click(
    token: str,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = decode_tracking_token(token)
        campaign_id = uuid.UUID(payload["campaign_id"])
        contact_id = uuid.UUID(payload["contact_id"])
        original_url = payload["url"]

        await record_event(
            db,
            campaign_id=campaign_id,
            contact_id=contact_id,
            event_type="clicked",
            url=original_url,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )
        await db.commit()
        return RedirectResponse(url=original_url, status_code=302)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid tracking token")


@router.get("/unsubscribe/{token}")
async def unsubscribe(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        contact_id = decode_unsubscribe_token(token)
        result = await db.execute(select(Contact).where(Contact.id == uuid.UUID(contact_id)))
        contact = result.scalar_one_or_none()
        if contact and not contact.is_suppressed:
            await suppress_contact(db, contact, "unsubscribed")
            await record_event(
                db,
                campaign_id=None,
                contact_id=uuid.UUID(contact_id),
                event_type="unsubscribed",
            )
            await db.commit()

        from fastapi.responses import HTMLResponse
        return HTMLResponse(
            content="""
            <html><body style="font-family:sans-serif;text-align:center;padding:50px">
            <h2>You have been unsubscribed</h2>
            <p>You will no longer receive emails from us.</p>
            </body></html>
            """,
            status_code=200,
        )
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid unsubscribe link")

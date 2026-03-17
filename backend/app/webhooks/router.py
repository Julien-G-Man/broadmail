from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.webhooks import service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _extract_tag_value(tags: object, name: str) -> str | None:
    if isinstance(tags, dict):
        value = tags.get(name)
        return str(value) if value is not None else None

    if isinstance(tags, list):
        for item in tags:
            if not isinstance(item, dict):
                continue
            if item.get("name") == name:
                value = item.get("value")
                return str(value) if value is not None else None

    return None


@router.post("/resend")
async def resend_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # Signature verification is mandatory — no unauthenticated fallback.
    if not settings.RESEND_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Webhook secret not configured. Set RESEND_WEBHOOK_SECRET in .env.",
        )
    try:
        from svix.webhooks import Webhook
        body = await request.body()
        wh = Webhook(settings.RESEND_WEBHOOK_SECRET)
        payload = wh.verify(body, dict(request.headers))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook signature: {e}")

    event_type = payload.get("type", "")
    data = payload.get("data", {})

    email = data.get("to", [None])[0] if isinstance(data.get("to"), list) else data.get("to")
    campaign_id = _extract_tag_value(data.get("tags"), "campaign_id")
    provider_event_id = payload.get("id")

    if event_type in ("email.bounced", "email.delivery_delayed"):
        await service.handle_bounce(db, email, campaign_id, provider_event_id)
    elif event_type == "email.complained":
        await service.handle_complaint(db, email, campaign_id, provider_event_id)
    elif event_type == "email.delivered":
        await service.handle_delivery(db, email, campaign_id, provider_event_id)

    await db.commit()
    return {"status": "ok"}

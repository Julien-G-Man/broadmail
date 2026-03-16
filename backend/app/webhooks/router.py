from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.webhooks import service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/resend")
async def resend_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # Verify Resend webhook signature via svix
    if settings.RESEND_WEBHOOK_SECRET:
        try:
            from svix.webhooks import Webhook, WebhookVerificationError
            body = await request.body()
            headers = dict(request.headers)
            wh = Webhook(settings.RESEND_WEBHOOK_SECRET)
            payload = wh.verify(body, headers)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid webhook signature: {e}")
    else:
        body = await request.body()
        import json
        payload = json.loads(body)

    event_type = payload.get("type", "")
    data = payload.get("data", {})

    email = data.get("to", [None])[0] if isinstance(data.get("to"), list) else data.get("to")
    campaign_id = data.get("tags", {}).get("campaign_id") if isinstance(data.get("tags"), dict) else None
    provider_event_id = payload.get("id")

    if event_type in ("email.bounced", "email.delivery_delayed"):
        await service.handle_bounce(db, email, campaign_id, provider_event_id)
    elif event_type == "email.complained":
        await service.handle_complaint(db, email, campaign_id, provider_event_id)
    elif event_type == "email.delivered":
        await service.handle_delivery(db, email, campaign_id, provider_event_id)

    await db.commit()
    return {"status": "ok"}

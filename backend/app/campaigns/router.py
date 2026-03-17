import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.campaigns.schemas import (
    CampaignCreate, CampaignUpdate, CampaignRead,
    CampaignStats, ScheduleRequest, RecipientRead, SendCampaignResponse,
)
from app.campaigns import service

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


@router.get("", response_model=list[CampaignRead])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    return await service.list_campaigns(db)


@router.post("", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    return await service.create_campaign(db, data, current_user.id)


@router.get("/{campaign_id}", response_model=CampaignRead)
async def get_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    campaign = await service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.patch("/{campaign_id}", response_model=CampaignRead)
async def update_campaign(
    campaign_id: uuid.UUID,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    campaign = await service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    try:
        return await service.update_campaign(db, campaign, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    campaign = await service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    try:
        await service.delete_campaign(db, campaign)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{campaign_id}/send", response_model=SendCampaignResponse)
async def send_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    campaign = await service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    try:
        # Prepare recipients before enqueueing
        await service.prepare_recipients(db, campaign)
        campaign = await service.enqueue_campaign(db, campaign)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if settings.SEND_MODE == "inline":
        # Inline mode is useful for low-cost deployments without a dedicated worker.
        try:
            from app.sending.worker import process_campaign

            await process_campaign({}, str(campaign_id))
            await db.refresh(campaign)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Inline send failed: {e}")
    else:
        # Queue mode (default): enqueue job and let the worker process recipients.
        try:
            import arq
            import structlog

            redis = await arq.create_pool(arq.connections.RedisSettings.from_dsn(settings.REDIS_URL))
            await redis.enqueue_job("process_campaign", str(campaign_id))
            await redis.aclose()
        except Exception as e:
            structlog.get_logger().error("arq_enqueue_failed", campaign_id=str(campaign_id), error=str(e))
            raise HTTPException(status_code=503, detail="Queue unavailable — please retry shortly")

    return {
        "campaign": campaign,
        "delivery_mode": settings.SEND_MODE,
    }


@router.post("/{campaign_id}/schedule", response_model=CampaignRead)
async def schedule_campaign(
    campaign_id: uuid.UUID,
    data: ScheduleRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    if settings.SEND_MODE == "inline":
        raise HTTPException(
            status_code=400,
            detail="Scheduling requires SEND_MODE=queue and a running worker",
        )

    campaign = await service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    try:
        return await service.schedule_campaign(db, campaign, data.scheduled_at)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{campaign_id}/cancel", response_model=CampaignRead)
async def cancel_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    campaign = await service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    try:
        return await service.cancel_campaign(db, campaign)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{campaign_id}/analytics", response_model=CampaignStats)
async def get_analytics(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    campaign = await service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return await service.get_campaign_stats(db, campaign_id)


@router.get("/{campaign_id}/recipients", response_model=dict)
async def list_recipients(
    campaign_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    campaign = await service.get_campaign(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    recipients, total = await service.list_recipients(db, campaign_id, page, page_size, status)
    return {
        "items": [RecipientRead.model_validate(r) for r in recipients],
        "total": total,
        "page": page,
        "page_size": page_size,
    }

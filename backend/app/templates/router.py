import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.templates.schemas import (
    TemplateCreate, TemplateUpdate, TemplateRead,
    TemplatePreviewRequest, TemplatePreviewResponse,
)
from app.templates import service

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=list[TemplateRead])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    return await service.list_templates(db)


@router.post("", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    return await service.create_template(db, data, current_user.id)


@router.get("/{template_id}", response_model=TemplateRead)
async def get_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    tmpl = await service.get_template(db, template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tmpl


@router.patch("/{template_id}", response_model=TemplateRead)
async def update_template(
    template_id: uuid.UUID,
    data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    tmpl = await service.get_template(db, template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return await service.update_template(db, tmpl, data)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    from app.campaigns.models import Campaign
    tmpl = await service.get_template(db, template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    count_result = await db.execute(
        select(func.count()).where(Campaign.template_id == template_id)
    )
    campaign_count = count_result.scalar_one()
    if campaign_count:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete — this template is used by {campaign_count} campaign(s). Delete those campaigns first.",
        )
    await service.delete_template(db, tmpl)


@router.post("/{template_id}/preview", response_model=TemplatePreviewResponse)
async def preview_template(
    template_id: uuid.UUID,
    data: TemplatePreviewRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    tmpl = await service.get_template(db, template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    rendered = service.preview_with_sample(tmpl, data.sample_contact)
    return TemplatePreviewResponse(subject=rendered.subject, html=rendered.html, text=rendered.text)

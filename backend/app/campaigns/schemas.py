from datetime import datetime
import uuid
from pydantic import BaseModel, EmailStr


class CampaignCreate(BaseModel):
    name: str
    from_name: str
    from_email: EmailStr
    reply_to: str | None = None
    template_id: uuid.UUID
    list_ids: list[uuid.UUID]


class CampaignUpdate(BaseModel):
    name: str | None = None
    from_name: str | None = None
    from_email: EmailStr | None = None
    reply_to: str | None = None
    template_id: uuid.UUID | None = None
    list_ids: list[uuid.UUID] | None = None


class CampaignRead(BaseModel):
    id: uuid.UUID
    name: str
    from_name: str
    from_email: str
    reply_to: str | None
    template_id: uuid.UUID | None
    list_ids: list[uuid.UUID]
    status: str
    scheduled_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    total_recipients: int
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CampaignStats(BaseModel):
    total_recipients: int
    sent: int
    failed: int
    skipped: int
    pending: int
    delivered: int
    opened: int
    clicked: int
    bounced: int
    unsubscribed: int
    open_rate: float
    click_rate: float


class ScheduleRequest(BaseModel):
    scheduled_at: datetime


class RecipientRead(BaseModel):
    id: uuid.UUID
    contact_id: uuid.UUID
    email: str
    status: str
    provider_id: str | None
    error: str | None
    processed_at: datetime | None

    model_config = {"from_attributes": True}

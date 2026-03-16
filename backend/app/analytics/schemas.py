from datetime import datetime
import uuid
from pydantic import BaseModel


class EventRead(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID | None
    contact_id: uuid.UUID | None
    event_type: str
    url: str | None
    occurred_at: datetime

    model_config = {"from_attributes": True}


class OverviewStats(BaseModel):
    total_contacts: int
    total_campaigns: int
    total_sent: int
    overall_open_rate: float
    overall_click_rate: float
    recent_campaigns: list[dict]

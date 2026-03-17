from datetime import datetime
import uuid
from pydantic import BaseModel
from typing import Any, Literal


class TemplateCreate(BaseModel):
    name: str
    subject: str
    html_body: str
    text_body: str | None = None
    mode: Literal["text", "custom"] = "text"


class TemplateUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    html_body: str | None = None
    text_body: str | None = None
    mode: Literal["text", "custom"] | None = None


class TemplateRead(BaseModel):
    id: uuid.UUID
    name: str
    subject: str
    html_body: str
    text_body: str | None
    variables: list[str]
    mode: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplatePreviewRequest(BaseModel):
    sample_contact: dict[str, Any] = {}


class TemplatePreviewResponse(BaseModel):
    subject: str
    html: str
    text: str

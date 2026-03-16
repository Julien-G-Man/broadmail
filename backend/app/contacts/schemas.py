from datetime import datetime
import uuid
from pydantic import BaseModel, EmailStr
from typing import Any


class ContactCreate(BaseModel):
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    custom_fields: dict[str, Any] = {}


class ContactUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    custom_fields: dict[str, Any] | None = None
    is_suppressed: bool | None = None


class ContactRead(BaseModel):
    id: uuid.UUID
    email: str
    first_name: str | None
    last_name: str | None
    custom_fields: dict[str, Any]
    is_suppressed: bool
    suppression_reason: str | None
    suppressed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ListCreate(BaseModel):
    name: str
    description: str | None = None
    org_tag: str = "enactus"


class ListUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ListRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    org_tag: str
    created_at: datetime
    member_count: int = 0

    model_config = {"from_attributes": True}


class ImportResult(BaseModel):
    created: int
    skipped: int
    invalid: int
    total: int


class AddContactsToList(BaseModel):
    contact_ids: list[uuid.UUID]

from datetime import datetime
import uuid
from pydantic import BaseModel, EmailStr, field_validator

_MAX_PASSWORD_BYTES = 72  # bcrypt hard limit


def _check_password_length(v: str) -> str:
    if len(v.encode("utf-8")) > _MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be {_MAX_PASSWORD_BYTES} characters or fewer")
    return v


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = "sender"

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _check_password_length(v)


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    role: str
    is_active: bool
    created_at: datetime
    created_by: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class PasswordResetRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _check_password_length(v)

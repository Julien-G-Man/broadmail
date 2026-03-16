import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    return pwd_context.hash(token)


def verify_refresh_token(token: str, token_hash: str) -> bool:
    return pwd_context.verify(token, token_hash)


def decode_access_token(token: str) -> dict[str, Any]:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("type") != "access":
        raise JWTError("Invalid token type")
    return payload


def create_tracking_token(data: dict[str, Any], expire_minutes: int | None = 60 * 24 * 7) -> str:
    to_encode = data.copy()
    if expire_minutes:
        expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
        to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_tracking_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


def create_unsubscribe_token(contact_id: str) -> str:
    # Long-lived token (10 years) — never expires for legal compliance
    expire = datetime.now(timezone.utc) + timedelta(days=3650)
    payload = {"sub": contact_id, "type": "unsubscribe", "exp": expire}
    return jwt.encode(payload, settings.UNSUBSCRIBE_SECRET, algorithm=ALGORITHM)


def decode_unsubscribe_token(token: str) -> str:
    payload = jwt.decode(token, settings.UNSUBSCRIBE_SECRET, algorithms=[ALGORITHM])
    if payload.get("type") != "unsubscribe":
        raise JWTError("Invalid token type")
    return payload["sub"]

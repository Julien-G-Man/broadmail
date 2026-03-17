import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

_BCRYPT_ROUNDS = 12
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    # Encode to bytes; bcrypt 4.x raises if > 72 bytes, so truncate safely.
    encoded = password.encode("utf-8")[:72]
    return bcrypt.hashpw(encoded, bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    encoded = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(encoded, hashed_password.encode("utf-8"))


def create_access_token(data: dict[str, Any], expire_minutes: int | None = None) -> str:
    to_encode = data.copy()
    minutes = expire_minutes if expire_minutes is not None else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    encoded = token.encode("utf-8")[:72]
    return bcrypt.hashpw(encoded, bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")


def verify_refresh_token(token: str, token_hash: str) -> bool:
    encoded = token.encode("utf-8")[:72]
    return bcrypt.checkpw(encoded, token_hash.encode("utf-8"))


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
    # No expiry — unsubscribe links must work permanently for legal compliance (CAN-SPAM).
    # Do NOT add an exp field; python-jose skips exp validation when the claim is absent.
    payload = {"sub": contact_id, "type": "unsubscribe"}
    return jwt.encode(payload, settings.UNSUBSCRIBE_SECRET, algorithm=ALGORITHM)


def decode_unsubscribe_token(token: str) -> str:
    payload = jwt.decode(
        token,
        settings.UNSUBSCRIBE_SECRET,
        algorithms=[ALGORITHM],
        options={"verify_exp": False},  # no exp claim — skip validation
    )
    if payload.get("type") != "unsubscribe":
        raise JWTError("Invalid token type")
    return payload["sub"]

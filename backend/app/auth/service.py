from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.models import User, RefreshToken
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    verify_refresh_token,
)
from app.core.config import settings


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


async def create_tokens(db: AsyncSession, user: User) -> tuple[str, str]:
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    raw_refresh = create_refresh_token()
    token_hash = hash_refresh_token(raw_refresh)

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_obj = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(refresh_token_obj)
    await db.flush()
    return access_token, raw_refresh


async def rotate_refresh_token(
    db: AsyncSession, raw_token: str
) -> tuple[str, str] | None:
    # Load all non-revoked, non-expired tokens and check each
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    tokens = result.scalars().all()

    matched: RefreshToken | None = None
    for t in tokens:
        if verify_refresh_token(raw_token, t.token_hash):
            matched = t
            break

    if not matched:
        return None

    # Revoke old token
    matched.revoked = True
    await db.flush()

    result = await db.execute(select(User).where(User.id == matched.user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None

    return await create_tokens(db, user)


async def revoke_token(db: AsyncSession, raw_token: str) -> bool:
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.revoked == False,
        )
    )
    tokens = result.scalars().all()
    for t in tokens:
        if verify_refresh_token(raw_token, t.token_hash):
            t.revoked = True
            await db.flush()
            return True
    return False

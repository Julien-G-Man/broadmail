"""
Auth dependencies — env-only authentication.
The only valid identity is FIRST_ADMIN_EMAIL from .env.
Any token whose sub does not match that email is rejected.
No database lookup is performed here.
"""
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.core.security import decode_access_token
from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def _admin_user() -> SimpleNamespace:
    """Construct the admin user object from env settings.
    id=None so that any created_by FK writes NULL (the column is nullable).
    A made-up UUID that doesn't exist in the users table would cause FK violations.
    """
    return SimpleNamespace(
        id=None,
        email=settings.FIRST_ADMIN_EMAIL.lower(),
        name="Admin",
        role="admin",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> SimpleNamespace:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(credentials.credentials)
        sub: str = payload.get("sub", "")
        # Only the single admin from .env is allowed
        if sub.lower() != settings.FIRST_ADMIN_EMAIL.lower():
            raise JWTError("Unauthorized identity")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _admin_user()


async def get_current_active_user(
    user: SimpleNamespace = Depends(get_current_user),
) -> SimpleNamespace:
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return user


async def require_admin(
    user: SimpleNamespace = Depends(get_current_active_user),
) -> SimpleNamespace:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user

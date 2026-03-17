import hmac
import structlog
from fastapi import APIRouter, HTTPException, status, Request, Depends

from app.core.dependencies import get_current_active_user
from app.core.rate_limit import limiter
from app.core.config import settings
from app.core.security import create_access_token

from app.auth.schemas import (
    LoginRequest,
    TokenResponse,
    UserRead,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = structlog.get_logger()

# Access token lifetime matches the next-auth session (7 days).
# No refresh tokens — the session expires when the JWT expires.
_TOKEN_LIFETIME_MINUTES = 60 * 24 * 7


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest):
    email_match = payload.email.lower() == settings.FIRST_ADMIN_EMAIL.lower()
    password_match = hmac.compare_digest(payload.password, settings.FIRST_ADMIN_PASSWORD)

    logger.info(
        "login_attempt",
        received_email=payload.email,
        email_match=email_match,
        password_match=password_match,
    )

    if not email_match or not password_match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(
        {"sub": settings.FIRST_ADMIN_EMAIL.lower(), "role": "admin"},
        expire_minutes=_TOKEN_LIFETIME_MINUTES,
    )
    return TokenResponse(access_token=access_token, refresh_token="")


@router.get("/me", response_model=UserRead)
async def me(current_user=Depends(get_current_active_user)):
    return current_user

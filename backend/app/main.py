from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException

import structlog

from app.core.config import settings
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.contacts.router import router as contacts_router
from app.templates.router import router as templates_router
from app.campaigns.router import router as campaigns_router
from app.analytics.router import router as analytics_router
from app.webhooks.router import router as webhooks_router

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)

app = FastAPI(
    title="Broadmail API",
    version="0.1.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(contacts_router)
app.include_router(templates_router)
app.include_router(campaigns_router)
app.include_router(analytics_router)
app.include_router(webhooks_router)


@app.get("/health")
async def health():
    return {"status": "ok"}

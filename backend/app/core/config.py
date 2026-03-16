from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import list as List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/broadmail"
    REDIS_URL: str = "redis://localhost:6379"

    # Email — Resend
    RESEND_API_KEY: str = ""
    RESEND_WEBHOOK_SECRET: str = ""

    # Email — SMTP fallback
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True

    # Tracking
    TRACKING_BASE_URL: str = "http://localhost:8000/"
    UNSUBSCRIBE_SECRET: str = "change-me-unsubscribe-secret"

    # Admin seed
    FIRST_ADMIN_EMAIL: str = ""
    FIRST_ADMIN_PASSWORD: str = ""

    # JWT settings
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator


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

    @field_validator("TRACKING_BASE_URL", mode="before")
    @classmethod
    def ensure_tracking_base_url_has_trailing_slash(cls, value: str) -> str:
        value = (value or "").strip()
        if not value:
            return value
        return value if value.endswith("/") else f"{value}/"

    @model_validator(mode="after")
    def validate_production_settings(self):
        if self.APP_ENV.lower() != "production":
            return self

        if not self.SECRET_KEY or self.SECRET_KEY == "change-me-in-production":
            raise ValueError("SECRET_KEY must be set to a strong value in production")

        if not self.UNSUBSCRIBE_SECRET or self.UNSUBSCRIBE_SECRET == "change-me-unsubscribe-secret":
            raise ValueError("UNSUBSCRIBE_SECRET must be set to a strong value in production")

        origins = [o for o in self.allowed_origins_list if o]
        if not origins:
            raise ValueError("ALLOWED_ORIGINS must include at least one origin in production")
        if "*" in origins:
            raise ValueError("ALLOWED_ORIGINS cannot contain '*' in production")

        return self

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()

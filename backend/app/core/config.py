from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator

load_dotenv()


class Settings(BaseSettings):
    """
    All values are read from .env via pydantic-settings.
    Fields with no default MUST be present in .env — the app will refuse to start otherwise.
    Fields with a default are optional; the default is only used if the var is absent.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str
    SECRET_KEY: str
    ALLOWED_ORIGINS: str
    DATABASE_URL: str
    FIRST_ADMIN_EMAIL: str
    FIRST_ADMIN_PASSWORD: str
    UNSUBSCRIBE_SECRET: str
    
    REDIS_URL: str = "redis://localhost:6379"
    SEND_MODE: str = "queue"  # queue | inline

    RESEND_API_KEY: str = ""
    RESEND_WEBHOOK_SECRET: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True

    TRACKING_BASE_URL: str = "http://localhost:5000/"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

 
    @field_validator("TRACKING_BASE_URL", mode="before")
    @classmethod
    def ensure_trailing_slash(cls, value: str) -> str:
        value = (value or "").strip()
        return value if not value or value.endswith("/") else f"{value}/"

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def normalize_redis_url(cls, value: str) -> str:
        v = (value or "").strip().strip('"').strip("'")
        if not v:
            return "redis://localhost:6379"
        if "://" not in v:
            # Accept host:port style env values and normalize for ARQ.
            return f"redis://{v}"
        return v

    @field_validator("SEND_MODE", mode="before")
    @classmethod
    def normalize_send_mode(cls, value: str) -> str:
        v = (value or "queue").strip().lower()
        if v not in {"queue", "inline"}:
            raise ValueError("SEND_MODE must be either 'queue' or 'inline'")
        return v

    @model_validator(mode="after")
    def validate_settings(self):
        if self.APP_ENV.lower() == "production":
            if self.SECRET_KEY in ("", "dev-secret-key"):
                raise ValueError("SECRET_KEY must be a strong value in production")
            if self.UNSUBSCRIBE_SECRET in ("", "dev-unsubscribe-secret"):
                raise ValueError("UNSUBSCRIBE_SECRET must be a strong value in production")
            origins = self.allowed_origins_list
            if not origins:
                raise ValueError("ALLOWED_ORIGINS must include at least one origin in production")
            if "*" in origins:
                raise ValueError("ALLOWED_ORIGINS cannot contain '*' in production")
        return self

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()

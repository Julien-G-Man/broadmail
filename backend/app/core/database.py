from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def _normalise_url(url: str) -> tuple[str, dict]:
    """Return (normalised_url, connect_args) for the given DATABASE_URL.

    - Strips ?sslmode=... from the URL (asyncpg ignores it and may error)
    - Passes ssl='require' as a connect_arg for Neon / any SSL Postgres
    """
    connect_args: dict = {}

    if url.startswith("postgresql://") or url.startswith("postgres://"):
        url = url.replace("://", "+asyncpg://", 1)

    if url.startswith("postgresql+asyncpg://"):
        # asyncpg needs ssl passed as connect_arg, not in URL query string
        if "sslmode=require" in url or "sslmode=verify-full" in url:
            url = (
                url
                .replace("?sslmode=require", "")
                .replace("&sslmode=require", "")
                .replace("?sslmode=verify-full", "")
                .replace("&sslmode=verify-full", "")
            )
            connect_args["ssl"] = "require"

    return url, connect_args


_db_url, _connect_args = _normalise_url(settings.DATABASE_URL)
_is_sqlite = _db_url.startswith("sqlite")

engine = create_async_engine(
    _db_url,
    echo=settings.APP_ENV == "development",
    connect_args=_connect_args,
    **({} if _is_sqlite else {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}),
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def _normalise_url(url: str) -> tuple[str, dict]:
    """Return (normalised_url, connect_args) for the given DATABASE_URL.

    asyncpg does not accept query-string parameters like sslmode or
    channel_binding — strip the entire query string and pass ssl via
    connect_args instead.
    """
    from urllib.parse import urlparse, urlunparse, parse_qs

    connect_args: dict = {}

    if url.startswith("postgresql://") or url.startswith("postgres://"):
        url = url.replace("://", "+asyncpg://", 1)

    if url.startswith("postgresql+asyncpg://"):
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        sslmode = params.get("sslmode", [""])[0]
        if sslmode in ("require", "verify-full", "verify-ca"):
            connect_args["ssl"] = "require"
        # Drop ALL query-string params — asyncpg handles none of them
        url = urlunparse(parsed._replace(query=""))

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

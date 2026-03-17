import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import all models to register them with Base metadata
from app.core.database import Base
from app.core.config import settings
import app.auth.models  # noqa
import app.contacts.models  # noqa
import app.templates.models  # noqa
import app.campaigns.models  # noqa
import app.analytics.models  # noqa

config = context.config

# Override sqlalchemy.url with our settings — normalise to async driver
from urllib.parse import urlparse, urlunparse, parse_qs

_db_url = settings.DATABASE_URL
if _db_url.startswith("postgresql://") or _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("://", "+asyncpg://", 1)

# asyncpg rejects ALL query-string params (sslmode, channel_binding, etc.)
# Strip the entire query string; ssl is passed via connect_args separately.
_parsed = urlparse(_db_url)
_qs_params = parse_qs(_parsed.query)
_sslmode = _qs_params.get("sslmode", [""])[0]
_needs_ssl = _sslmode in ("require", "verify-full", "verify-ca") or "neon.tech" in _db_url
_db_url = urlunparse(_parsed._replace(query=""))

config.set_main_option("sqlalchemy.url", _db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={"ssl": "require"} if _needs_ssl else {},
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

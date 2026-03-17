import asyncio
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import hash_password
from app.auth.models import User

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
TEST_ADMIN_EMAIL = "admin@test.com"
TEST_ADMIN_PASSWORD = "testpassword"
_AUTH_HEADERS_CACHE: dict[str, str] | None = None


@pytest.fixture(autouse=True)
def override_env_admin_credentials():
    old_email = settings.FIRST_ADMIN_EMAIL
    old_password = settings.FIRST_ADMIN_PASSWORD
    settings.FIRST_ADMIN_EMAIL = TEST_ADMIN_EMAIL
    settings.FIRST_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD
    try:
        yield
    finally:
        settings.FIRST_ADMIN_EMAIL = old_email
        settings.FIRST_ADMIN_PASSWORD = old_password


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_user(db_session):
    user = User(
        email=f"admin-{uuid.uuid4().hex[:8]}@test.com",
        name="Test Admin",
        hashed_password=hash_password(TEST_ADMIN_PASSWORD),
        role="admin",
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def sender_user(db_session):
    user = User(
        email=f"sender-{uuid.uuid4().hex[:8]}@test.com",
        name="Test Sender",
        hashed_password=hash_password(TEST_ADMIN_PASSWORD),
        role="sender",
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


async def get_auth_headers(client, email=TEST_ADMIN_EMAIL, password=TEST_ADMIN_PASSWORD):
    global _AUTH_HEADERS_CACHE

    if _AUTH_HEADERS_CACHE is not None:
        return _AUTH_HEADERS_CACHE

    response = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    _AUTH_HEADERS_CACHE = {"Authorization": f"Bearer {token}"}
    return _AUTH_HEADERS_CACHE

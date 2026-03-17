"""
Auth dependencies — stubbed for dev mode.
All routes that Depend on these receive a dummy admin user without any token check.
Re-enable by restoring the real implementations when auth is needed.
"""
from types import SimpleNamespace
import uuid

# Shared dummy user returned by all auth dependencies.
# id=None so that created_by writes NULL — the FK is nullable and NULL is always
# valid. A hardcoded UUID that doesn't exist in the users table would cause FK
# violations on every write in production (Neon DB) or any fresh database.
_DUMMY_USER = SimpleNamespace(
    id=None,
    email="dev@broadmail.local",
    name="Dev User",
    role="admin",
    is_active=True,
)


async def get_current_user():
    return _DUMMY_USER


async def get_current_active_user():
    return _DUMMY_USER


async def require_admin():
    return _DUMMY_USER

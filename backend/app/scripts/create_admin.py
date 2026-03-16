"""
Management script to seed the first admin user.
Usage: python -m app.scripts.create_admin
"""
import asyncio
import sys

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.auth.models import User
from sqlalchemy import select


async def create_admin():
    if not settings.FIRST_ADMIN_EMAIL or not settings.FIRST_ADMIN_PASSWORD:
        print("ERROR: Set FIRST_ADMIN_EMAIL and FIRST_ADMIN_PASSWORD in .env")
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == settings.FIRST_ADMIN_EMAIL.lower())
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"Admin already exists: {settings.FIRST_ADMIN_EMAIL}")
            return

        admin = User(
            email=settings.FIRST_ADMIN_EMAIL.lower(),
            name="Admin",
            hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
            role="admin",
        )
        db.add(admin)
        await db.commit()
        print(f"Admin created: {settings.FIRST_ADMIN_EMAIL}")


if __name__ == "__main__":
    asyncio.run(create_admin())

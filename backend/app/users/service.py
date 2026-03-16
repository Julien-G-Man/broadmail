import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.models import User
from app.core.security import hash_password
from app.users.schemas import UserCreate, UserUpdate


async def create_user(db: AsyncSession, data: UserCreate, created_by: uuid.UUID) -> User:
    user = User(
        email=data.email.lower(),
        name=data.name,
        hashed_password=hash_password(data.password),
        role=data.role,
        created_by=created_by,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def update_user(db: AsyncSession, user: User, data: UserUpdate) -> User:
    if data.name is not None:
        user.name = data.name
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    await db.flush()
    await db.refresh(user)
    return user


async def deactivate_user(db: AsyncSession, user: User) -> User:
    user.is_active = False
    await db.flush()
    return user


async def reset_password(db: AsyncSession, user: User, new_password: str) -> User:
    user.hashed_password = hash_password(new_password)
    await db.flush()
    return user

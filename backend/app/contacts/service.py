import io
import uuid
from datetime import datetime, timezone

import pandas as pd
from fastapi import UploadFile
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.contacts.models import Contact, ContactList, ContactListMembership
from app.contacts.schemas import ContactCreate, ContactUpdate, ListCreate, ListUpdate, ImportResult


def is_valid_email(email: str) -> bool:
    import re
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


# --- Contacts ---

async def create_contact(db: AsyncSession, data: ContactCreate) -> Contact:
    contact = Contact(
        email=data.email.lower(),
        first_name=data.first_name,
        last_name=data.last_name,
        custom_fields=data.custom_fields,
    )
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return contact


async def upsert_contact(db: AsyncSession, data: dict) -> tuple[Contact, bool]:
    email = data["email"].lower()
    result = await db.execute(select(Contact).where(Contact.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        return existing, False
    contact = Contact(
        email=email,
        first_name=data.get("first_name") or None,
        last_name=data.get("last_name") or None,
        custom_fields=data.get("custom_fields", {}),
    )
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return contact, True


async def list_contacts(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    list_id: uuid.UUID | None = None,
    suppressed: bool | None = None,
) -> tuple[list[Contact], int]:
    query = select(Contact)
    if search:
        query = query.where(
            Contact.email.ilike(f"%{search}%")
            | Contact.first_name.ilike(f"%{search}%")
            | Contact.last_name.ilike(f"%{search}%")
        )
    if list_id:
        query = query.join(ContactListMembership).where(ContactListMembership.list_id == list_id)
    if suppressed is not None:
        query = query.where(Contact.is_suppressed == suppressed)

    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar_one()

    query = query.offset((page - 1) * page_size).limit(page_size).order_by(Contact.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all(), total


async def get_contact(db: AsyncSession, contact_id: uuid.UUID) -> Contact | None:
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    return result.scalar_one_or_none()


async def update_contact(db: AsyncSession, contact: Contact, data: ContactUpdate) -> Contact:
    if data.first_name is not None:
        contact.first_name = data.first_name
    if data.last_name is not None:
        contact.last_name = data.last_name
    if data.custom_fields is not None:
        contact.custom_fields = data.custom_fields
    if data.is_suppressed is not None:
        contact.is_suppressed = data.is_suppressed
    await db.flush()
    await db.refresh(contact)
    return contact


async def delete_contact(db: AsyncSession, contact: Contact) -> None:
    await db.delete(contact)
    await db.flush()


async def suppress_contact(
    db: AsyncSession, contact: Contact, reason: str
) -> Contact:
    contact.is_suppressed = True
    contact.suppression_reason = reason
    contact.suppressed_at = datetime.now(timezone.utc)
    await db.flush()
    return contact


async def import_from_file(
    db: AsyncSession, file: UploadFile, list_id: uuid.UUID | None
) -> ImportResult:
    contents = await file.read()
    filename = file.filename or ""

    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        df = pd.read_excel(io.BytesIO(contents), sheet_name=0)
    else:
        df = pd.read_csv(io.BytesIO(contents), encoding="utf-8-sig")

    df.columns = df.columns.str.lower().str.strip()
    df = df.dropna(subset=["email"])

    assert "email" in df.columns, "File must have an 'email' column"

    created = skipped = invalid = 0
    for _, row in df.iterrows():
        email = str(row["email"]).strip().lower()
        if not is_valid_email(email):
            invalid += 1
            continue

        custom = {
            k: (None if pd.isna(v) else v)
            for k, v in row.items()
            if k not in ("email", "first_name", "last_name")
        }
        contact_data = {
            "email": email,
            "first_name": str(row["first_name"]).strip() if "first_name" in row and not pd.isna(row.get("first_name")) else "",
            "last_name": str(row["last_name"]).strip() if "last_name" in row and not pd.isna(row.get("last_name")) else "",
            "custom_fields": custom,
        }

        contact, was_created = await upsert_contact(db, contact_data)
        if was_created:
            created += 1
        else:
            skipped += 1

        if list_id:
            await add_to_list(db, contact.id, list_id)

    return ImportResult(created=created, skipped=skipped, invalid=invalid, total=created + skipped + invalid)


# --- Lists ---

async def create_list(db: AsyncSession, data: ListCreate, created_by: uuid.UUID) -> ContactList:
    contact_list = ContactList(
        name=data.name,
        description=data.description,
        org_tag=data.org_tag,
        created_by=created_by,
    )
    db.add(contact_list)
    await db.flush()
    await db.refresh(contact_list)
    return contact_list


async def list_contact_lists(db: AsyncSession) -> list[ContactList]:
    result = await db.execute(select(ContactList).order_by(ContactList.created_at.desc()))
    return result.scalars().all()


async def get_contact_list(db: AsyncSession, list_id: uuid.UUID) -> ContactList | None:
    result = await db.execute(select(ContactList).where(ContactList.id == list_id))
    return result.scalar_one_or_none()


async def update_contact_list(db: AsyncSession, contact_list: ContactList, data: ListUpdate) -> ContactList:
    if data.name is not None:
        contact_list.name = data.name
    if data.description is not None:
        contact_list.description = data.description
    await db.flush()
    await db.refresh(contact_list)
    return contact_list


async def delete_contact_list(db: AsyncSession, contact_list: ContactList) -> None:
    await db.delete(contact_list)
    await db.flush()


async def add_to_list(db: AsyncSession, contact_id: uuid.UUID, list_id: uuid.UUID) -> None:
    existing = await db.execute(
        select(ContactListMembership).where(
            ContactListMembership.contact_id == contact_id,
            ContactListMembership.list_id == list_id,
        )
    )
    if existing.scalar_one_or_none():
        return
    membership = ContactListMembership(contact_id=contact_id, list_id=list_id)
    db.add(membership)
    await db.flush()


async def remove_from_list(db: AsyncSession, contact_id: uuid.UUID, list_id: uuid.UUID) -> None:
    await db.execute(
        delete(ContactListMembership).where(
            ContactListMembership.contact_id == contact_id,
            ContactListMembership.list_id == list_id,
        )
    )
    await db.flush()


async def get_list_member_count(db: AsyncSession, list_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).where(ContactListMembership.list_id == list_id)
    )
    return result.scalar_one()

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.contacts.schemas import (
    ContactCreate, ContactUpdate, ContactRead,
    ListCreate, ListUpdate, ListRead,
    ImportResult, AddContactsToList,
)
from app.contacts import service

router = APIRouter(tags=["contacts"])


# --- Contacts ---

@router.get("/api/contacts", response_model=dict)
async def list_contacts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    list_id: uuid.UUID | None = Query(None),
    suppressed: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    contacts, total = await service.list_contacts(db, page, page_size, search, list_id, suppressed)
    return {
        "items": [ContactRead.model_validate(c) for c in contacts],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/api/contacts", response_model=ContactRead, status_code=status.HTTP_201_CREATED)
async def create_contact(
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    return await service.create_contact(db, data)


@router.get("/api/contacts/{contact_id}", response_model=ContactRead)
async def get_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    contact = await service.get_contact(db, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.patch("/api/contacts/{contact_id}", response_model=ContactRead)
async def update_contact(
    contact_id: uuid.UUID,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    contact = await service.get_contact(db, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return await service.update_contact(db, contact, data)


@router.delete("/api/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    contact = await service.get_contact(db, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    await service.delete_contact(db, contact)


@router.post("/api/contacts/import", response_model=ImportResult)
async def import_contacts(
    file: UploadFile = File(...),
    list_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    if not file.filename or not (
        file.filename.endswith(".csv")
        or file.filename.endswith(".xlsx")
        or file.filename.endswith(".xls")
    ):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
    return await service.import_from_file(db, file, list_id)


# --- Lists ---

@router.get("/api/lists", response_model=list[ListRead])
async def list_contact_lists(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    lists = await service.list_contact_lists(db)
    result = []
    for lst in lists:
        count = await service.get_list_member_count(db, lst.id)
        read = ListRead.model_validate(lst)
        read.member_count = count
        result.append(read)
    return result


@router.post("/api/lists", response_model=ListRead, status_code=status.HTTP_201_CREATED)
async def create_list(
    data: ListCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    return await service.create_list(db, data, current_user.id)


@router.get("/api/lists/{list_id}", response_model=ListRead)
async def get_list(
    list_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    lst = await service.get_contact_list(db, list_id)
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    count = await service.get_list_member_count(db, list_id)
    read = ListRead.model_validate(lst)
    read.member_count = count
    return read


@router.patch("/api/lists/{list_id}", response_model=ListRead)
async def update_list(
    list_id: uuid.UUID,
    data: ListUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    lst = await service.get_contact_list(db, list_id)
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    return await service.update_contact_list(db, lst, data)


@router.delete("/api/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(
    list_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    lst = await service.get_contact_list(db, list_id)
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    await service.delete_contact_list(db, lst)


@router.get("/api/lists/{list_id}/contacts", response_model=dict)
async def get_list_contacts(
    list_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    lst = await service.get_contact_list(db, list_id)
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    contacts, total = await service.list_contacts(db, page, page_size, list_id=list_id)
    return {
        "items": [ContactRead.model_validate(c) for c in contacts],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/api/lists/{list_id}/contacts", status_code=status.HTTP_204_NO_CONTENT)
async def add_contacts_to_list(
    list_id: uuid.UUID,
    data: AddContactsToList,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    lst = await service.get_contact_list(db, list_id)
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    for contact_id in data.contact_ids:
        await service.add_to_list(db, contact_id, list_id)


@router.delete("/api/lists/{list_id}/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_contact_from_list(
    list_id: uuid.UUID,
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_active_user),
):
    await service.remove_from_list(db, contact_id, list_id)

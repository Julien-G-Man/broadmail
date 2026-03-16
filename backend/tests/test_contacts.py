import io
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_headers


@pytest.mark.asyncio
async def test_create_contact(client: AsyncClient, admin_user):
    headers = await get_auth_headers(client)
    response = await client.post(
        "/api/contacts",
        json={"email": "contact@example.com", "first_name": "John", "last_name": "Doe"},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "contact@example.com"
    assert data["first_name"] == "John"


@pytest.mark.asyncio
async def test_list_contacts(client: AsyncClient, admin_user):
    headers = await get_auth_headers(client)
    response = await client.get("/api/contacts", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_contact(client: AsyncClient, admin_user):
    headers = await get_auth_headers(client)
    create = await client.post(
        "/api/contacts",
        json={"email": "getme@example.com"},
        headers=headers,
    )
    contact_id = create.json()["id"]
    response = await client.get(f"/api/contacts/{contact_id}", headers=headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_import_csv(client: AsyncClient, admin_user):
    headers = await get_auth_headers(client)
    csv_data = "email,first_name,last_name\nimport1@test.com,Alice,Smith\nimport2@test.com,Bob,Jones\n"
    response = await client.post(
        "/api/contacts/import",
        files={"file": ("contacts.csv", io.BytesIO(csv_data.encode()), "text/csv")},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["created"] == 2
    assert data["invalid"] == 0


@pytest.mark.asyncio
async def test_create_list(client: AsyncClient, admin_user):
    headers = await get_auth_headers(client)
    response = await client.post(
        "/api/lists",
        json={"name": "Test List", "description": "A test list"},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test List"


@pytest.mark.asyncio
async def test_list_lists(client: AsyncClient, admin_user):
    headers = await get_auth_headers(client)
    response = await client.get("/api/lists", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

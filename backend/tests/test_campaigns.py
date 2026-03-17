import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_headers
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock


@pytest.mark.asyncio
async def test_create_campaign(client: AsyncClient, admin_user, db_session):
    from app.templates.models import EmailTemplate
    template = EmailTemplate(
        name="Test Template",
        subject="Hello {{ first_name }}",
        html_body="<p>Hello {{ first_name }}</p>",
        variables=["first_name"],
        created_by=admin_user.id,
    )
    db_session.add(template)
    await db_session.flush()

    headers = await get_auth_headers(client)
    response = await client.post(
        "/api/campaigns",
        json={
            "name": "Test Campaign",
            "from_name": "Enactus KNUST",
            "from_email": "noreply@enactusknust.com",
            "reply_to": "contact@enactusknust.com",
            "template_id": str(template.id),
            "list_ids": [],
        },
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Campaign"
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_list_campaigns(client: AsyncClient, admin_user):
    headers = await get_auth_headers(client)
    response = await client.get("/api/campaigns", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_campaign_status_transitions(client: AsyncClient, admin_user, db_session):
    from app.templates.models import EmailTemplate
    template = EmailTemplate(
        name="Status Test Template",
        subject="Hi",
        html_body="<p>Hi</p>",
        variables=[],
        created_by=admin_user.id,
    )
    db_session.add(template)
    await db_session.flush()

    headers = await get_auth_headers(client)
    create = await client.post(
        "/api/campaigns",
        json={
            "name": "Status Test Campaign",
            "from_name": "Test",
            "from_email": "test@test.com",
            "template_id": str(template.id),
            "list_ids": [],
        },
        headers=headers,
    )
    assert create.status_code == 201
    campaign_id = create.json()["id"]

    # Schedule it
    future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    schedule = await client.post(
        f"/api/campaigns/{campaign_id}/schedule",
        json={"scheduled_at": future},
        headers=headers,
    )
    assert schedule.status_code == 200
    assert schedule.json()["status"] == "scheduled"

    # Cancel it
    cancel = await client.post(f"/api/campaigns/{campaign_id}/cancel", headers=headers)
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_dispatch_scheduled_campaigns_enqueues_due_campaign(db_session, admin_user, monkeypatch):
    from app.campaigns.models import Campaign
    from app.sending import worker

    campaign = Campaign(
        name="Scheduled Campaign",
        from_name="Enactus KNUST",
        from_email="noreply@enactusknust.com",
        list_ids=[],
        status="scheduled",
        scheduled_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        created_by=admin_user.id,
    )
    db_session.add(campaign)
    await db_session.flush()

    @asynccontextmanager
    async def fake_session_local():
        yield db_session

    redis = AsyncMock()

    monkeypatch.setattr(worker, "AsyncSessionLocal", fake_session_local)
    monkeypatch.setattr(worker, "prepare_recipients", AsyncMock(return_value=0))

    await worker.dispatch_scheduled_campaigns({"redis": redis})

    await db_session.refresh(campaign)
    assert campaign.status == "queued"
    redis.enqueue_job.assert_awaited_once_with("process_campaign", str(campaign.id))

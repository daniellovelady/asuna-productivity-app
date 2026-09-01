from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import create_app


@pytest.fixture
def bare_app():
    get_settings.cache_clear()
    application = create_app()
    yield application
    application.dependency_overrides.clear()
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_unauthenticated_request_rejects_before_settings(bare_app, monkeypatch):
    settings_calls = 0
    supabase_called = False

    def tracked_get_settings():
        nonlocal settings_calls
        settings_calls += 1
        raise AssertionError("get_settings must not be called before authentication.")

    monkeypatch.setattr("app.config.get_settings", tracked_get_settings)

    async def tracked_acreate_client(*args, **kwargs):
        nonlocal supabase_called
        supabase_called = True
        raise AssertionError("Supabase client must not be created without authentication.")

    monkeypatch.setattr(
        "app.services.supabase_session.acreate_client",
        tracked_acreate_client,
    )

    agent_called = False

    class TrackingWorkflow:
        def __init__(self, *args, **kwargs):
            nonlocal agent_called
            agent_called = True
            raise AssertionError("Coach workflow must not run without authentication.")

    monkeypatch.setattr("app.routes.coach.CoachWorkflow", TrackingWorkflow)

    async with AsyncClient(
        transport=ASGITransport(app=bare_app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/v1/coach/analyze",
            json={"question": "How productive was I this week?"},
        )

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"
    assert settings_calls == 0
    assert supabase_called is False
    assert agent_called is False


@pytest.mark.asyncio
async def test_malformed_authorization_rejects_before_settings(bare_app, monkeypatch):
    settings_calls = 0

    def tracked_get_settings():
        nonlocal settings_calls
        settings_calls += 1
        raise AssertionError("get_settings must not be called before authentication.")

    monkeypatch.setattr("app.config.get_settings", tracked_get_settings)

    async with AsyncClient(
        transport=ASGITransport(app=bare_app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/v1/coach/analyze",
            json={"question": "How productive was I this week?"},
            headers={"Authorization": "NotBearer abc"},
        )

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"
    assert settings_calls == 0


@pytest.mark.asyncio
async def test_valid_bearer_missing_config_returns_configuration_error(bare_app, monkeypatch):
    from app.errors import AppError

    supabase_called = False

    async def tracked_acreate_client(*args, **kwargs):
        nonlocal supabase_called
        supabase_called = True
        raise AssertionError("Supabase client must not be created when configuration is missing.")

    monkeypatch.setattr(
        "app.services.supabase_session.acreate_client",
        tracked_acreate_client,
    )

    def raise_missing_supabase_config():
        raise AppError(
            "configuration_error",
            "Coach service is not configured.",
            503,
        )

    monkeypatch.setattr(
        "app.dependencies.load_required_settings",
        raise_missing_supabase_config,
    )

    agent_called = False

    class TrackingWorkflow:
        def __init__(self, *args, **kwargs):
            nonlocal agent_called
            agent_called = True
            raise AssertionError("Coach workflow must not run when configuration is missing.")

    monkeypatch.setattr("app.routes.coach.CoachWorkflow", TrackingWorkflow)

    async with AsyncClient(
        transport=ASGITransport(app=bare_app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/v1/coach/analyze",
            json={"question": "How productive was I this week?"},
            headers={"Authorization": "Bearer fake-token"},
        )

    assert response.status_code == 503
    body = response.json()
    assert body["code"] == "configuration_error"
    assert "supabase_url" not in response.text
    assert "Field required" not in response.text
    assert supabase_called is False
    assert agent_called is False

import pytest
from pydantic import SecretStr

from app.config import Settings, get_settings
from app.main import create_app


@pytest.fixture
def settings() -> Settings:
    return Settings(
        openai_api_key=SecretStr("test-openai-key"),
        openai_model="gpt-4.1-mini",
        supabase_url="https://example.supabase.co",
        supabase_publishable_key=SecretStr("test-publishable-key"),
        supabase_request_timeout_seconds=10.0,
        coach_agent_timeout_seconds=45.0,
        coach_max_turns=6,
        coach_max_active_tasks_returned=25,
        enable_reviewer_agent=False,
    )


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def app(settings: Settings, monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setattr("app.config.get_settings", lambda: settings)
    monkeypatch.setattr("app.dependencies.get_settings", lambda: settings)
    application = create_app()
    yield application
    application.dependency_overrides.clear()

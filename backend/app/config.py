from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-4.1-mini"
    supabase_url: str
    supabase_publishable_key: SecretStr
    supabase_request_timeout_seconds: float = Field(default=10.0, gt=0)
    coach_agent_timeout_seconds: float = Field(default=45.0, gt=0)
    coach_max_turns: int = Field(default=6, ge=1)
    coach_max_active_tasks_returned: int = Field(default=25, ge=1)
    enable_reviewer_agent: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


def is_openai_configured(settings: Settings) -> bool:
    if settings.openai_api_key is None:
        return False
    return bool(settings.openai_api_key.get_secret_value().strip())

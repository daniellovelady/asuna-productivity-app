from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

import httpx
from supabase import AsyncClient, acreate_client
from supabase.lib.client_options import AsyncClientOptions

from app.config import Settings
from app.errors import AnalyticsServiceError, AuthenticationError, TaskServiceError
from app.services.analytics_service import AnalyticsService
from app.services.task_service import TaskService
from app.agents.context import AuthenticatedRequestContext

if TYPE_CHECKING:
    pass


def _build_client_options(settings: Settings) -> AsyncClientOptions:
    timeout = httpx.Timeout(settings.supabase_request_timeout_seconds)
    return AsyncClientOptions(
        persist_session=False,
        auto_refresh_token=False,
        httpx_client=httpx.AsyncClient(timeout=timeout),
    )


async def validate_access_token(
    client: AsyncClient,
    access_token: str,
    settings: Settings,
) -> str:
    try:
        response = await asyncio.wait_for(
            client.auth.get_user(jwt=access_token),
            timeout=settings.supabase_request_timeout_seconds,
        )
    except Exception as exc:
        raise AuthenticationError("Invalid or expired access token.") from exc

    user = response.user
    if user is None or not user.id:
        raise AuthenticationError("Invalid or expired access token.")
    return user.id


@asynccontextmanager
async def create_request_context(
    access_token: str,
    *,
    request_id: str | None = None,
    settings: Settings,
) -> AsyncIterator[AuthenticatedRequestContext]:
    client = await acreate_client(
        settings.supabase_url,
        settings.supabase_publishable_key.get_secret_value(),
        options=_build_client_options(settings),
    )

    try:
        user_id = await validate_access_token(client, access_token, settings)
        client.postgrest.auth(access_token)

        ctx = AuthenticatedRequestContext(
            request_id=request_id or str(uuid.uuid4()),
            user_id=user_id,
            access_token=access_token,
            settings=settings,
            client=client,
            analytics_service=AnalyticsService(client),
            task_service=TaskService(
                client,
                max_returned=settings.coach_max_active_tasks_returned,
            ),
        )
        yield ctx
    finally:
        close = getattr(client, "aclose", None)
        if callable(close):
            await close()


# Module-level tracker for tests verifying isolation (not used in production logic).
_active_context_ids: set[str] = set()


def _track_context(ctx: AuthenticatedRequestContext) -> None:
    if ctx.request_id in _active_context_ids:
        raise RuntimeError("Request context ID collision detected.")
    _active_context_ids.add(ctx.request_id)


def _untrack_context(ctx: AuthenticatedRequestContext) -> None:
    _active_context_ids.discard(ctx.request_id)

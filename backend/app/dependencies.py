from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Header
from pydantic import ValidationError

from app.agents.context import AuthenticatedRequestContext
from app.config import Settings, get_settings
from app.errors import AppError, AuthenticationError
from app.models.coach import CoachAnalyzeRequest
from app.services.supabase_session import create_request_context


def extract_bearer_token(authorization: str | None) -> str:
    if authorization is None:
        raise AuthenticationError("Missing Authorization header.")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise AuthenticationError("Invalid Authorization header.")
    return parts[1].strip()


def load_required_settings() -> Settings:
    try:
        return get_settings()
    except ValidationError as exc:
        raise AppError(
            "configuration_error",
            "Coach service is not configured.",
            503,
        ) from exc


async def get_authenticated_context(
    body: CoachAnalyzeRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> AsyncIterator[AuthenticatedRequestContext]:
    access_token = extract_bearer_token(authorization)
    settings = load_required_settings()
    request_id = str(uuid.uuid4())

    async with create_request_context(
        access_token,
        request_id=request_id,
        settings=settings,
    ) as ctx:
        ctx.question = body.question
        yield ctx

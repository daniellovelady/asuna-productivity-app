from __future__ import annotations

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends

from app.agents.context import AuthenticatedRequestContext
from app.agents.message_variation import MessageVariationService
from app.dependencies import get_bearer_authenticated_context
from app.errors import AppError
from app.models.assistant_message import VaryMessageRequest, VaryMessageResponse

router = APIRouter(prefix="/v1/assistant", tags=["assistant"])


@router.post("/vary-message", response_model=VaryMessageResponse)
async def vary_message(
    body: VaryMessageRequest,
    req_ctx: Annotated[AuthenticatedRequestContext, Depends(get_bearer_authenticated_context)],
) -> VaryMessageResponse:
    service = MessageVariationService(req_ctx.settings)

    try:
        return await service.vary(body)
    except asyncio.TimeoutError as exc:
        raise AppError("timeout", "Message variation timed out.", 504) from exc

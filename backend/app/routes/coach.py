from __future__ import annotations

import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.agents.context import AuthenticatedRequestContext
from app.agents.workflow import CoachWorkflow, create_run_context
from app.dependencies import get_authenticated_context
from app.diagnostics import diagnostics_enabled
from app.errors import AppError, CoachError, VerificationFailedError
from app.models.coach import CoachAnalyzeResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/coach", tags=["coach"])


def _log_coach_response(response: CoachAnalyzeResponse, *, http_status: int) -> None:
    if not diagnostics_enabled():
        return
    logger.warning(
        "coach response request_id=%s status=%s verification_status=%s "
        "has_result=%s error_code=%s tools_used=%s",
        response.request_id,
        http_status,
        response.verification_status,
        response.result is not None,
        response.error.code if response.error else None,
        response.tools_used,
    )


@router.post("/analyze", response_model=CoachAnalyzeResponse)
async def analyze_coach(
    req_ctx: Annotated[AuthenticatedRequestContext, Depends(get_authenticated_context)],
) -> CoachAnalyzeResponse:
    run_context = create_run_context(req_ctx, req_ctx.access_token)
    workflow = CoachWorkflow(req_ctx.settings)

    try:
        workflow_result = await workflow.run(req_ctx.question, run_context)
    except asyncio.TimeoutError as exc:
        raise AppError(
            "timeout",
            "Coach request timed out.",
            504,
        ) from exc
    except VerificationFailedError as exc:
        response = CoachAnalyzeResponse(
            request_id=req_ctx.request_id,
            verification_status="repair_exhausted",
            tools_used=run_context.tool_state.tools_used(),
            result=None,
            error=CoachError(code=exc.code, message=exc.message),
        )
        _log_coach_response(response, http_status=422)
        return JSONResponse(
            status_code=422,
            content=response.model_dump(),
        )

    await workflow.maybe_run_reviewer(
        workflow_result.agent_result,
        workflow_result.verified,
    )

    response = CoachAnalyzeResponse(
        request_id=req_ctx.request_id,
        verification_status=workflow_result.verification_status,
        tools_used=workflow_result.tools_used,
        result=workflow_result.verified,
        error=None,
    )
    _log_coach_response(response, http_status=200)
    return response

from __future__ import annotations

import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.agents.context import AuthenticatedRequestContext
from app.agents.weekly_workflow import WeeklyInsightWorkflow
from app.dependencies import get_bearer_authenticated_context
from app.diagnostics import diagnostics_enabled
from app.errors import AppError, CoachError, VerificationFailedError
from app.models.weekly_insight import WeeklyInsightReportResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/insights", tags=["insights"])


@router.post("/weekly-report", response_model=WeeklyInsightReportResponse)
async def weekly_report(
    req_ctx: Annotated[AuthenticatedRequestContext, Depends(get_bearer_authenticated_context)],
) -> WeeklyInsightReportResponse:
    workflow = WeeklyInsightWorkflow(req_ctx.settings)

    try:
        workflow_result = await workflow.run(req_ctx)
    except asyncio.TimeoutError as exc:
        raise AppError(
            "timeout",
            "Weekly report request timed out.",
            504,
        ) from exc
    except VerificationFailedError as exc:
        response = WeeklyInsightReportResponse(
            request_id=req_ctx.request_id,
            verification_status="repair_exhausted",
            report=None,
            error=CoachError(code=exc.code, message=exc.message),
        )
        return JSONResponse(
            status_code=422,
            content=response.model_dump(),
        )

    if diagnostics_enabled():
        logger.warning(
            "weekly report request_id=%s verification_status=%s",
            req_ctx.request_id,
            workflow_result.verification_status,
        )

    return WeeklyInsightReportResponse(
        request_id=req_ctx.request_id,
        verification_status=workflow_result.verification_status,
        report=workflow_result.report,
        error=None,
    )

from __future__ import annotations

from agents import RunContextWrapper, function_tool
from agents.tool import ToolContext

from app.agents.context import CoachRunContext
from app.errors import AnalyticsServiceError, TaskServiceError


def sanitized_tool_failure(_ctx: ToolContext, error: Exception) -> str:
    if isinstance(error, AnalyticsServiceError):
        return "analytics_unavailable"
    if isinstance(error, TaskServiceError):
        return "tasks_unavailable"
    return "tool_unavailable"


@function_tool(failure_error_function=sanitized_tool_failure)
async def get_productivity_snapshot(
    ctx: RunContextWrapper[CoachRunContext],
) -> dict:
    """Return deterministic productivity analytics for the authenticated user."""
    run_ctx = ctx.context
    try:
        snapshot = await run_ctx.analytics_service.fetch_snapshot()
        payload = snapshot.to_evidence_payload()
        run_ctx.tool_state.record_success("get_productivity_snapshot", payload)
        return payload
    except AnalyticsServiceError:
        run_ctx.tool_state.record_failure(
            "get_productivity_snapshot",
            "analytics_unavailable",
        )
        raise


@function_tool(failure_error_function=sanitized_tool_failure)
async def get_active_tasks_summary(
    ctx: RunContextWrapper[CoachRunContext],
) -> dict:
    """Return a read-only summary of active tasks for the authenticated user."""
    run_ctx = ctx.context
    try:
        summary = await run_ctx.task_service.fetch_active_summary()
        payload = summary.to_evidence_payload()
        run_ctx.tool_state.record_success("get_active_tasks_summary", payload)
        return payload
    except TaskServiceError:
        run_ctx.tool_state.record_failure(
            "get_active_tasks_summary",
            "tasks_unavailable",
        )
        raise

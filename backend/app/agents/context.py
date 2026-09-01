from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from supabase import AsyncClient

from app.config import Settings
from app.services.analytics_service import AnalyticsService
from app.services.task_service import TaskService


ToolName = Literal[
    "get_productivity_snapshot",
    "get_active_tasks_summary",
]

ToolStatus = Literal["success", "failed", "not_called"]


@dataclass
class ToolRecord:
    status: ToolStatus
    code: str | None = None
    payload: dict[str, Any] | None = None


@dataclass
class ToolStateRegistry:
    records: dict[str, ToolRecord] = field(default_factory=dict)

    def record_success(self, tool: ToolName, payload: dict[str, Any]) -> None:
        self.records[tool] = ToolRecord(status="success", payload=payload)

    def record_failure(self, tool: ToolName, code: str) -> None:
        self.records[tool] = ToolRecord(status="failed", code=code)

    def get_payload(self, source: str) -> dict[str, Any] | None:
        tool_map = {
            "analytics": "get_productivity_snapshot",
            "tasks": "get_active_tasks_summary",
        }
        tool_name = tool_map.get(source)
        if tool_name is None:
            return None
        record = self.records.get(tool_name)
        if record is None or record.status != "success" or record.payload is None:
            return None
        return record.payload

    def tools_used(self) -> list[str]:
        return [
            name
            for name, record in self.records.items()
            if record.status == "success"
        ]

    def tool_failed(self, tool: ToolName) -> bool:
        record = self.records.get(tool)
        return record is not None and record.status == "failed"

    def tool_succeeded(self, tool: ToolName) -> bool:
        record = self.records.get(tool)
        return record is not None and record.status == "success"


@dataclass
class AuthenticatedRequestContext:
    request_id: str
    user_id: str
    access_token: str = field(repr=False)
    settings: Settings
    client: AsyncClient
    analytics_service: AnalyticsService
    task_service: TaskService
    question: str | None = None

    async def aclose(self) -> None:
        if hasattr(self.client, "aclose"):
            await self.client.aclose()


@dataclass
class CoachRunContext:
    request_id: str
    trace_id: str
    user_id: str
    access_token: str = field(repr=False)
    analytics_service: AnalyticsService
    task_service: TaskService
    tool_state: ToolStateRegistry = field(default_factory=ToolStateRegistry)

    @classmethod
    def from_request(
        cls,
        request_ctx: AuthenticatedRequestContext,
        trace_id: str,
        access_token: str,
    ) -> CoachRunContext:
        return cls(
            request_id=request_ctx.request_id,
            trace_id=trace_id,
            user_id=request_ctx.user_id,
            access_token=access_token,
            analytics_service=request_ctx.analytics_service,
            task_service=request_ctx.task_service,
        )

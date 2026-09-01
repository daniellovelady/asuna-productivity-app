from __future__ import annotations

from typing import Any

from supabase import AsyncClient

from app.errors import TaskServiceError
from app.models.tasks import (
    PRIORITY_RANK,
    ActiveTaskItem,
    ActiveTasksSummary,
    TaskPriority,
    TaskStatus,
)


def _parse_priority(value: Any) -> TaskPriority:
    if value not in ("low", "medium", "high"):
        raise TaskServiceError("Task response contained an invalid priority.")
    return value


def _parse_status(value: Any) -> TaskStatus:
    if value not in ("pending", "in_progress"):
        raise TaskServiceError("Task response contained an invalid status.")
    return value


def sort_active_tasks(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        rows,
        key=lambda row: (
            PRIORITY_RANK[_parse_priority(row.get("priority"))],
            -_parse_created_at(row.get("created_at")),
        ),
    )


def _parse_created_at(value: Any) -> float:
    if not isinstance(value, str) or not value:
        return 0.0
    try:
        from datetime import datetime

        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


class TaskService:
    def __init__(self, client: AsyncClient, max_returned: int = 25) -> None:
        self._client = client
        self._max_returned = max_returned

    async def fetch_active_summary(self) -> ActiveTasksSummary:
        response = (
            await self._client.table("tasks")
            .select("id, title, status, priority, created_at")
            .in_("status", ["pending", "in_progress"])
            .execute()
        )

        if response.data is None:
            raise TaskServiceError("Task query returned no data.")

        rows = [row for row in response.data if isinstance(row, dict)]
        sorted_rows = sort_active_tasks(rows)
        active_count = len(sorted_rows)
        limited_rows = sorted_rows[: self._max_returned]

        tasks = [
            ActiveTaskItem(
                id=str(row["id"]),
                title=str(row["title"]),
                status=_parse_status(row.get("status")),
                priority=_parse_priority(row.get("priority")),
            )
            for row in limited_rows
        ]

        return ActiveTasksSummary(
            active_count=active_count,
            returned_count=len(tasks),
            truncated=active_count > len(tasks),
            tasks=tasks,
        )

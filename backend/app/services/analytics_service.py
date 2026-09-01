from __future__ import annotations

from typing import Any

from supabase import AsyncClient

from app.errors import AnalyticsServiceError
from app.models.analytics import (
    AnalyticsDistractingApp,
    AnalyticsFocusByDay,
    AnalyticsFocusByTask,
    AnalyticsRange,
    AnalyticsSnapshot,
)


def _read_number(value: Any, field: str) -> int | float:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise AnalyticsServiceError(f"Analytics response is missing a valid {field}.")
    return value


def _read_string(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value:
        raise AnalyticsServiceError(f"Analytics response is missing a valid {field}.")
    return value


def map_analytics_snapshot(raw: Any) -> AnalyticsSnapshot:
    if not isinstance(raw, dict):
        raise AnalyticsServiceError("Analytics response was empty or invalid.")

    range_raw = raw.get("range")
    if not isinstance(range_raw, dict):
        raise AnalyticsServiceError("Analytics response is missing range.")

    focus_by_day: list[AnalyticsFocusByDay] = []
    raw_focus_by_day = raw.get("focusByDay")
    if not isinstance(raw_focus_by_day, list):
        raise AnalyticsServiceError("Analytics response is missing focusByDay.")
    for index, entry in enumerate(raw_focus_by_day):
        if not isinstance(entry, dict):
            raise AnalyticsServiceError(f"Analytics focusByDay[{index}] is invalid.")
        focus_by_day.append(
            AnalyticsFocusByDay(
                date=_read_string(entry.get("date"), f"focusByDay[{index}].date"),
                focusMinutes=int(
                    _read_number(
                        entry.get("focusMinutes"),
                        f"focusByDay[{index}].focusMinutes",
                    )
                ),
            )
        )

    focus_by_task: list[AnalyticsFocusByTask] = []
    raw_focus_by_task = raw.get("focusByTask")
    if not isinstance(raw_focus_by_task, list):
        raise AnalyticsServiceError("Analytics response is missing focusByTask.")
    for index, entry in enumerate(raw_focus_by_task):
        if not isinstance(entry, dict):
            raise AnalyticsServiceError(f"Analytics focusByTask[{index}] is invalid.")
        focus_by_task.append(
            AnalyticsFocusByTask(
                taskLabel=_read_string(
                    entry.get("taskLabel"),
                    f"focusByTask[{index}].taskLabel",
                ),
                focusMinutes=int(
                    _read_number(
                        entry.get("focusMinutes"),
                        f"focusByTask[{index}].focusMinutes",
                    )
                ),
            )
        )

    distracting_apps: list[AnalyticsDistractingApp] = []
    raw_apps = raw.get("topDistractingApps")
    if not isinstance(raw_apps, list):
        raise AnalyticsServiceError("Analytics response is missing topDistractingApps.")
    for index, entry in enumerate(raw_apps):
        if not isinstance(entry, dict):
            raise AnalyticsServiceError(
                f"Analytics topDistractingApps[{index}] is invalid."
            )
        distracting_apps.append(
            AnalyticsDistractingApp(
                applicationName=_read_string(
                    entry.get("applicationName"),
                    f"topDistractingApps[{index}].applicationName",
                ),
                estimatedMinutes=float(
                    _read_number(
                        entry.get("estimatedMinutes"),
                        f"topDistractingApps[{index}].estimatedMinutes",
                    )
                ),
            )
        )

    avg_session = raw.get("averageSessionMinutes")
    break_compliance = raw.get("breakCompliancePercent")

    return AnalyticsSnapshot(
        range=AnalyticsRange(
            start=_read_string(range_raw.get("start"), "range.start"),
            end=_read_string(range_raw.get("end"), "range.end"),
            timezone=_read_string(range_raw.get("timezone"), "range.timezone"),
        ),
        focusTodayMinutes=int(_read_number(raw.get("focusTodayMinutes"), "focusTodayMinutes")),
        totalFocusMinutes=int(_read_number(raw.get("totalFocusMinutes"), "totalFocusMinutes")),
        completedSessions=int(_read_number(raw.get("completedSessions"), "completedSessions")),
        interruptionCount=int(_read_number(raw.get("interruptionCount"), "interruptionCount")),
        averageSessionMinutes=(
            float(_read_number(avg_session, "averageSessionMinutes"))
            if avg_session is not None
            else None
        ),
        breakCompliancePercent=(
            float(_read_number(break_compliance, "breakCompliancePercent"))
            if break_compliance is not None
            else None
        ),
        focusByDay=focus_by_day,
        focusByTask=focus_by_task,
        topDistractingApps=distracting_apps,
    )


class AnalyticsService:
    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def fetch_snapshot(self) -> AnalyticsSnapshot:
        response = await self._client.rpc("get_analytics_snapshot").execute()
        if response.data is None:
            raise AnalyticsServiceError("Analytics RPC returned no data.")
        return map_analytics_snapshot(response.data)

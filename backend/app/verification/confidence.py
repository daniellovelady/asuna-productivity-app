from __future__ import annotations

from app.models.analytics import AnalyticsSnapshot
from app.models.weekly_insight import DataConfidence


def count_active_focus_days(snapshot: AnalyticsSnapshot) -> int:
    return sum(1 for day in snapshot.focusByDay if day.focusMinutes > 0)


def compute_data_confidence(snapshot: AnalyticsSnapshot) -> DataConfidence:
    active_days = count_active_focus_days(snapshot)

    if (
        snapshot.completedSessions >= 5
        and snapshot.totalFocusMinutes >= 120
        and active_days >= 5
    ):
        return "high"

    if (
        snapshot.completedSessions >= 2
        and snapshot.totalFocusMinutes >= 30
        and active_days >= 3
    ):
        return "medium"

    return "low"

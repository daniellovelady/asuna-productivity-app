import pytest

from app.errors import AnalyticsServiceError
from app.models.analytics import AnalyticsSnapshot
from app.services.analytics_service import map_analytics_snapshot


VALID_SNAPSHOT = {
    "range": {
        "start": "2026-08-25",
        "end": "2026-08-31",
        "timezone": "America/Chicago",
    },
    "focusTodayMinutes": 98,
    "totalFocusMinutes": 393,
    "completedSessions": 11,
    "interruptionCount": 7,
    "averageSessionMinutes": 27.1,
    "breakCompliancePercent": 60.0,
    "focusByDay": [{"date": "2026-08-25", "focusMinutes": 40}],
    "focusByTask": [{"taskLabel": "Capstone", "focusMinutes": 160}],
    "topDistractingApps": [{"applicationName": "youtube", "estimatedMinutes": 2.5}],
}


def test_map_analytics_snapshot_success():
    snapshot = map_analytics_snapshot(VALID_SNAPSHOT)
    assert isinstance(snapshot, AnalyticsSnapshot)
    assert snapshot.totalFocusMinutes == 393


def test_map_analytics_snapshot_failure():
    with pytest.raises(AnalyticsServiceError):
        map_analytics_snapshot({})


def test_zero_focus_is_legitimate_zero():
    payload = {**VALID_SNAPSHOT, "totalFocusMinutes": 0}
    snapshot = map_analytics_snapshot(payload)
    assert snapshot.totalFocusMinutes == 0

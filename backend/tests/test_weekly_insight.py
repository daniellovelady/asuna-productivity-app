from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.analytics import (
    AnalyticsFocusByDay,
    AnalyticsRange,
    AnalyticsSnapshot,
)
from app.models.evidence import EvidenceClaim
from app.models.weekly_insight import InsightItem, WeeklyInsightAgentResult
from app.verification.confidence import compute_data_confidence
from app.verification.weekly_report_verifier import verify_weekly_report


def _snapshot(
    *,
    completed_sessions: int = 0,
    total_focus_minutes: int = 0,
    focus_days: list[int] | None = None,
) -> AnalyticsSnapshot:
    days = focus_days or [0, 0, 0, 0, 0, 0, 0]
    return AnalyticsSnapshot(
        range=AnalyticsRange(start="2026-08-25", end="2026-08-31", timezone="UTC"),
        focusTodayMinutes=0,
        totalFocusMinutes=total_focus_minutes,
        completedSessions=completed_sessions,
        interruptionCount=0,
        averageSessionMinutes=None,
        breakCompliancePercent=None,
        focusByDay=[
            AnalyticsFocusByDay(date=f"2026-08-{25 + index}", focusMinutes=minutes)
            for index, minutes in enumerate(days)
        ],
        focusByTask=[],
        topDistractingApps=[],
    )


def test_compute_data_confidence_levels() -> None:
    assert compute_data_confidence(_snapshot()) == "low"
    assert compute_data_confidence(
        _snapshot(completed_sessions=2, total_focus_minutes=35, focus_days=[10, 0, 10, 15, 0, 0, 0])
    ) == "medium"
    assert compute_data_confidence(
        _snapshot(
            completed_sessions=5,
            total_focus_minutes=150,
            focus_days=[20, 30, 25, 30, 25, 20, 0],
        )
    ) == "high"


def test_weekly_agent_result_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        WeeklyInsightAgentResult.model_validate(
            {
                "summary": {
                    "text": "Summary",
                    "evidence": [{"source": "analytics", "path": "/analytics/totalFocusMinutes"}],
                },
                "strengths": [],
                "observations": [],
                "recommendations": [],
                "limitations": [],
                "data_confidence": "high",
            }
        )


def test_weekly_verifier_requires_evidence() -> None:
    payload = _snapshot(completed_sessions=1, total_focus_minutes=25).to_evidence_payload()
    result = WeeklyInsightAgentResult(
        summary=InsightItem(
            text="Based on your A.S.U.N.A. data, you have recorded focus activity.",
            evidence=[EvidenceClaim(source="analytics", path="/analytics/totalFocusMinutes")],
        ),
        strengths=[],
        observations=[],
        recommendations=[],
        limitations=[],
    )
    verification = verify_weekly_report(result, payload)
    assert verification.ok is True


def test_weekly_verifier_rejects_missing_evidence() -> None:
    with pytest.raises(ValidationError):
        WeeklyInsightAgentResult(
            summary=InsightItem(text="No evidence", evidence=[]),
            strengths=[],
            observations=[],
            recommendations=[],
            limitations=[],
        )

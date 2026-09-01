from app.agents.context import ToolStateRegistry
from app.models.evidence import CoachAgentResult, EvidenceClaim
from app.verification.evidence_verifier import (
    PlanRequirements,
    classify_question,
    verify_coach_result,
)
from app.verification.mutation_claims import scan_mutation_claims
from app.verification.path_resolver import resolve_path_value


def _analytics_payload():
    return {
        "totalFocusMinutes": 101,
        "completedSessions": 5,
        "focusByDay": [{"date": "2026-08-31", "focusMinutes": 40}],
        "items": [],
    }


def test_resolve_valid_path():
    registry = ToolStateRegistry()
    registry.record_success(
        "get_productivity_snapshot",
        {"totalFocusMinutes": 101, "focusByDay": [{"date": "2026-08-31", "focusMinutes": 40}]},
    )
    assert (
        resolve_path_value("analytics", "/analytics/totalFocusMinutes", registry)
        == "101"
    )
    assert (
        resolve_path_value("analytics", "/analytics/focusByDay/0/focusMinutes", registry)
        == "40"
    )


def test_invalid_path_fails_verification():
    registry = ToolStateRegistry()
    registry.record_success("get_productivity_snapshot", _analytics_payload())
    result = CoachAgentResult(
        answer="Based on your A.S.U.N.A. data, you focused for 101 minutes.",
        recommendations=[],
        evidence=[EvidenceClaim(source="analytics", path="/analytics/missing")],
        limitations=[],
    )
    verification = verify_coach_result(
        result,
        registry,
        PlanRequirements(requires_analytics=True),
    )
    assert verification.ok is False


def test_evidence_from_uncalled_tool_fails():
    registry = ToolStateRegistry()
    result = CoachAgentResult(
        answer="Based on your A.S.U.N.A. data.",
        recommendations=[],
        evidence=[EvidenceClaim(source="analytics", path="/analytics/totalFocusMinutes")],
        limitations=[],
    )
    verification = verify_coach_result(
        result,
        registry,
        PlanRequirements(requires_analytics=True),
    )
    assert verification.ok is False


def test_unsupported_personalized_numeric_claim_fails():
    registry = ToolStateRegistry()
    registry.record_success(
        "get_productivity_snapshot",
        {"totalFocusMinutes": 101, "completedSessions": 7},
    )
    result = CoachAgentResult(
        answer="Based on your A.S.U.N.A. data, you completed 999 sessions.",
        recommendations=[],
        evidence=[
            EvidenceClaim(source="analytics", path="/analytics/completedSessions"),
        ],
        limitations=[],
    )
    verification = verify_coach_result(
        result,
        registry,
        PlanRequirements(requires_analytics=True),
    )
    assert verification.ok is False
    assert any(
        failure.startswith("UNSUPPORTED_NUMERIC_CLAIM:count:")
        for failure in verification.failures
    )


def test_mutation_claim_detected():
    assert scan_mutation_claims("I've marked your task complete.")


def test_classify_productivity_question():
    plan = classify_question("How productive was I this week?")
    assert plan.requires_analytics is True

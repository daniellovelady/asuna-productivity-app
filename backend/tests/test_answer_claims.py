from app.agents.context import ToolStateRegistry
from app.models.evidence import CoachAgentResult, EvidenceClaim, ResolvedEvidence
from app.verification.answer_claims import extract_numeric_claims, verify_numeric_claims
from app.verification.date_literals import collect_date_literal_spans
from app.verification.evidence_verifier import PlanRequirements, verify_coach_result


def _personalized_prefix() -> str:
    return "Based on your A.S.U.N.A. data, "


def _account_a_payload() -> dict:
    return {
        "totalFocusMinutes": 101,
        "focusTodayMinutes": 98,
        "completedSessions": 7,
        "interruptionCount": 3,
        "averageSessionMinutes": 27.1538461538,
        "breakCompliancePercent": 60.0,
        "focusByDay": [{"date": "2026-08-31", "focusMinutes": 40}],
        "focusByTask": [{"taskLabel": "Capstone", "focusMinutes": 160}],
        "topDistractingApps": [{"applicationName": "youtube", "estimatedMinutes": 2.5}],
    }


def _resolved_account_a() -> list[ResolvedEvidence]:
    return [
        ResolvedEvidence(
            source="analytics",
            path="/analytics/totalFocusMinutes",
            value="101",
        ),
        ResolvedEvidence(
            source="analytics",
            path="/analytics/completedSessions",
            value="7",
        ),
    ]


def test_date_literal_spans_cover_common_formats():
    spans = collect_date_literal_spans("Aug 27 and August 28 with 2026-08-27")
    covered = "".join(
        "Aug 27 and August 28 with 2026-08-27"[start:end] for start, end in spans
    )
    assert "Aug 27" in covered
    assert "August 28" in covered
    assert "2026-08-27" in covered


def test_date_literals_do_not_create_quantitative_claims():
    cases = (
        "you reviewed Aug 27",
        "you reviewed August 28",
        "you reviewed Aug 26 through Sep 1",
        "you reviewed Aug 26–Sep 1",
        "you reviewed 2026-08-27",
    )
    for fragment in cases:
        answer = _personalized_prefix() + fragment
        claims = extract_numeric_claims(answer)
        assert claims == [], fragment


def test_sessions_on_date_keep_count_not_day_number():
    answer = _personalized_prefix() + "you completed 7 sessions on Aug 27."
    claims = extract_numeric_claims(answer)
    assert any(claim.kind == "count" and claim.value == 7 for claim in claims)
    assert not any(claim.value == 27 for claim in claims)


def test_minutes_on_date_keep_minutes_not_day_number():
    answer = _personalized_prefix() + "you focused for 50 minutes on Aug 27."
    claims = extract_numeric_claims(answer)
    assert any(claim.kind == "minutes" and claim.value == 50 for claim in claims)
    assert not any(claim.value == 27 for claim in claims)


def test_live_account_a_style_answer_with_cited_focus_by_day_passes():
    resolved = [
        ResolvedEvidence(source="analytics", path="/analytics/totalFocusMinutes", value="106"),
        ResolvedEvidence(source="analytics", path="/analytics/focusByDay/0/focusMinutes", value="50"),
        ResolvedEvidence(source="analytics", path="/analytics/focusByDay/1/focusMinutes", value="30"),
        ResolvedEvidence(
            source="analytics",
            path="/analytics/focusByDay/0/date",
            value="2026-08-27",
        ),
        ResolvedEvidence(
            source="analytics",
            path="/analytics/focusByDay/1/date",
            value="2026-08-28",
        ),
    ]
    answer = (
        _personalized_prefix()
        + "you focused for 50 minutes on Aug 27 and 30 minutes on Aug 28."
    )
    assert verify_numeric_claims(answer, resolved) == []


def test_focus_by_day_minutes_fail_without_cited_paths():
    resolved = [
        ResolvedEvidence(source="analytics", path="/analytics/totalFocusMinutes", value="106"),
    ]
    answer = (
        _personalized_prefix()
        + "you focused for 50 minutes on Aug 27 and 30 minutes on Aug 28."
    )
    failures = verify_numeric_claims(answer, resolved)
    assert failures
    assert all(failure.startswith("UNSUPPORTED_NUMERIC_CLAIM:minutes:") for failure in failures)


def test_duration_phrase_101_minutes_passes():
    answer = "Based on your A.S.U.N.A. data, you focused for 1 hour and 41 minutes this week."
    claims = extract_numeric_claims(answer)
    assert any(claim.kind == "minutes" and claim.value == 101 for claim in claims)
    assert not any(claim.value == 1 for claim in claims)
    assert not any(claim.value == 41 for claim in claims)
    assert verify_numeric_claims(answer, _resolved_account_a()) == []


def test_duration_variants_pass():
    resolved = [
        ResolvedEvidence(source="analytics", path="/analytics/totalFocusMinutes", value="101"),
    ]
    for answer in (
        "Based on your data, you focused for 101 minutes this week.",
        "Based on your data, you focused for 1h 41m this week.",
        "Based on your data, you focused for 1 hour 41 minutes this week.",
    ):
        assert verify_numeric_claims(answer, resolved) == []


def test_duration_wrong_value_fails():
    resolved = [
        ResolvedEvidence(source="analytics", path="/analytics/totalFocusMinutes", value="101"),
    ]
    failures = verify_numeric_claims(
        "Based on your data, you focused for 2 hours this week.",
        resolved,
    )
    assert failures
    assert failures[0].startswith("UNSUPPORTED_NUMERIC_CLAIM:minutes:")


def test_completed_sessions_count_passes():
    answer = "Based on your A.S.U.N.A. data, you completed 7 sessions this week."
    resolved = [
        ResolvedEvidence(
            source="analytics",
            path="/analytics/completedSessions",
            value="7",
        ),
    ]
    assert verify_numeric_claims(answer, resolved) == []


def test_completed_sessions_wrong_count_fails():
    answer = "Based on your A.S.U.N.A. data, you completed 8 sessions this week."
    resolved = [
        ResolvedEvidence(
            source="analytics",
            path="/analytics/completedSessions",
            value="7",
        ),
    ]
    failures = verify_numeric_claims(answer, resolved)
    assert failures
    assert failures[0].startswith("UNSUPPORTED_NUMERIC_CLAIM:count:")


def test_duration_wrong_minutes_fails():
    resolved = [
        ResolvedEvidence(source="analytics", path="/analytics/totalFocusMinutes", value="101"),
    ]
    failures = verify_numeric_claims(
        "Based on your data, you focused for 102 minutes this week.",
        resolved,
    )
    assert failures
    assert failures[0].startswith("UNSUPPORTED_NUMERIC_CLAIM:minutes:")


def test_total_focus_minutes_rejects_unrelated_minute_value():
    resolved = [
        ResolvedEvidence(source="analytics", path="/analytics/totalFocusMinutes", value="106"),
    ]
    failures = verify_numeric_claims(
        _personalized_prefix() + "you focused for 120 minutes this week.",
        resolved,
    )
    assert failures
    assert failures[0].startswith("UNSUPPORTED_NUMERIC_CLAIM:minutes:")


def test_decimal_hours_equivalence():
    resolved = [
        ResolvedEvidence(source="analytics", path="/analytics/totalFocusMinutes", value="90"),
    ]
    for answer in (
        "Based on your data, you focused for 1.5 hours this week.",
        "Based on your data, you focused for 1 hour 30 minutes this week.",
    ):
        assert verify_numeric_claims(answer, resolved) == []


def test_short_minutes_only():
    resolved = [
        ResolvedEvidence(source="analytics", path="/analytics/totalFocusMinutes", value="7"),
    ]
    assert verify_numeric_claims("Based on your data, you focused for 7m today.", resolved) == []


def test_break_compliance_percent_rounding_passes():
    answer = "Based on your A.S.U.N.A. data, your break compliance was 33.3% this week."
    resolved = [
        ResolvedEvidence(
            source="analytics",
            path="/analytics/breakCompliancePercent",
            value="33.333333",
        ),
    ]
    assert verify_numeric_claims(answer, resolved) == []


def test_break_compliance_percent_wrong_fails():
    answer = "Based on your A.S.U.N.A. data, your break compliance was 50% this week."
    resolved = [
        ResolvedEvidence(
            source="analytics",
            path="/analytics/breakCompliancePercent",
            value="33.333333",
        ),
    ]
    failures = verify_numeric_claims(answer, resolved)
    assert failures
    assert failures[0].startswith("UNSUPPORTED_NUMERIC_CLAIM:percent:")


def test_count_fields_do_not_accept_duration_format():
    resolved = [
        ResolvedEvidence(
            source="analytics",
            path="/analytics/completedSessions",
            value="7",
        ),
    ]
    failures = verify_numeric_claims(
        "Based on your data, you completed 1 hour 41 minutes of sessions.",
        resolved,
    )
    assert failures


def test_break_compliance_percent_passes():
    answer = "Based on your A.S.U.N.A. data, your break compliance was 60% this week."
    resolved = [
        ResolvedEvidence(
            source="analytics",
            path="/analytics/breakCompliancePercent",
            value="60",
        ),
    ]
    assert verify_numeric_claims(answer, resolved) == []


def test_account_a_style_answer_passes_verification():
    registry = ToolStateRegistry()
    registry.record_success("get_productivity_snapshot", _account_a_payload())
    result = CoachAgentResult(
        answer=(
            "Based on your A.S.U.N.A. data, you focused for 1 hour and 41 minutes "
            "this week and completed 7 sessions."
        ),
        recommendations=[],
        evidence=[
            EvidenceClaim(source="analytics", path="/analytics/totalFocusMinutes"),
            EvidenceClaim(source="analytics", path="/analytics/completedSessions"),
        ],
        limitations=[],
    )
    verification = verify_coach_result(
        result,
        registry,
        PlanRequirements(requires_analytics=True),
    )
    assert verification.ok is True


def test_account_b_zero_values_pass_verification():
    registry = ToolStateRegistry()
    registry.record_success(
        "get_productivity_snapshot",
        {
            "totalFocusMinutes": 0,
            "completedSessions": 0,
            "focusByDay": [],
            "focusByTask": [],
            "topDistractingApps": [],
        },
    )
    registry.record_success(
        "get_active_tasks_summary",
        {"activeCount": 1, "returnedCount": 1, "truncated": False, "items": []},
    )
    result = CoachAgentResult(
        answer="Based on your A.S.U.N.A. data, you focused for 0 minutes and completed 0 sessions.",
        recommendations=[],
        evidence=[
            EvidenceClaim(source="analytics", path="/analytics/totalFocusMinutes"),
            EvidenceClaim(source="analytics", path="/analytics/completedSessions"),
            EvidenceClaim(source="tasks", path="/tasks/activeCount"),
        ],
        limitations=[],
    )
    verification = verify_coach_result(
        result,
        registry,
        PlanRequirements(requires_analytics=True),
    )
    assert verification.ok is True


def test_live_account_a_end_to_end_with_focus_by_day_evidence():
    registry = ToolStateRegistry()
    registry.record_success(
        "get_productivity_snapshot",
        {
            "totalFocusMinutes": 106,
            "completedSessions": 7,
            "focusByDay": [
                {"date": "2026-08-27", "focusMinutes": 50},
                {"date": "2026-08-28", "focusMinutes": 30},
            ],
            "focusByTask": [],
            "topDistractingApps": [],
        },
    )
    result = CoachAgentResult(
        answer=(
            _personalized_prefix()
            + "you focused for 106 minutes this week, including 50 minutes on Aug 27 "
            + "and 30 minutes on Aug 28."
        ),
        recommendations=[],
        evidence=[
            EvidenceClaim(source="analytics", path="/analytics/totalFocusMinutes"),
            EvidenceClaim(source="analytics", path="/analytics/focusByDay/0/focusMinutes"),
            EvidenceClaim(source="analytics", path="/analytics/focusByDay/1/focusMinutes"),
            EvidenceClaim(source="analytics", path="/analytics/focusByDay/0/date"),
            EvidenceClaim(source="analytics", path="/analytics/focusByDay/1/date"),
        ],
        limitations=[],
    )
    verification = verify_coach_result(
        result,
        registry,
        PlanRequirements(requires_analytics=True),
    )
    assert verification.ok is True

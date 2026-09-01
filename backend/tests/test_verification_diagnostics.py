import pytest
from unittest.mock import AsyncMock, patch

from app.agents.context import CoachRunContext
from app.agents.workflow import CoachWorkflow
from app.diagnostics import diagnostics_enabled
from app.errors import VerificationFailedError
from app.models.evidence import CoachAgentResult, EvidenceClaim
from app.verification.diagnostic_failures import sanitize_verification_failures


def test_diagnostics_enabled_reads_environment_variable(monkeypatch):
    monkeypatch.delenv("COACH_DIAGNOSTICS", raising=False)
    assert diagnostics_enabled() is False
    monkeypatch.setenv("COACH_DIAGNOSTICS", "1")
    assert diagnostics_enabled() is True
    monkeypatch.setenv("COACH_DIAGNOSTICS", " 1 ")
    assert diagnostics_enabled() is True
    monkeypatch.setenv("COACH_DIAGNOSTICS", "0")
    assert diagnostics_enabled() is False


def test_sanitize_verification_failures_strips_answer_text():
    failures = [
        (
            "UNSUPPORTED_NUMERIC_CLAIM:minutes:120:"
            "claimed='2 hours':canonical=/analytics/totalFocusMinutes=101"
        ),
        "NUMERIC_CLAIM_WITHOUT_EVIDENCE:count:5:5 completed sessions",
        "UNRESOLVED_PATH:analytics:/analytics/missing",
        "MUTATION_CLAIM",
    ]
    sanitized = sanitize_verification_failures(failures)
    assert sanitized == [
        {
            "code": "UNSUPPORTED_NUMERIC_CLAIM",
            "claim_type": "minutes",
            "claimed": 120,
            "path": "/analytics/totalFocusMinutes",
            "canonical": 101,
        },
        {
            "code": "NUMERIC_CLAIM_WITHOUT_EVIDENCE",
            "claim_type": "count",
            "claimed": 5,
            "path": None,
        },
        {
            "code": "UNRESOLVED_PATH",
            "path": "/analytics/missing",
        },
        {"code": "MUTATION_CLAIM"},
    ]
    serialized = repr(sanitized)
    assert "2 hours" not in serialized
    assert "completed sessions" not in serialized


@pytest.mark.asyncio
async def test_verification_failure_emits_sanitized_warning_logs(
    settings,
    monkeypatch,
    capsys,
):
    monkeypatch.setenv("COACH_DIAGNOSTICS", "1")

    workflow = CoachWorkflow(settings)
    run_context = CoachRunContext(
        request_id="req-diagnostics-1",
        trace_id="trace_test",
        user_id="user-1",
        access_token="secret-access-token-should-not-appear",
        analytics_service=AsyncMock(),
        task_service=AsyncMock(),
    )

    sensitive_answer = (
        "Based on your A.S.U.N.A. data, you focused for 2 hours and completed "
        "999 sessions with secret task title Capstone."
    )
    invalid = CoachAgentResult(
        answer=sensitive_answer,
        recommendations=["Do the secret thing."],
        evidence=[EvidenceClaim(source="analytics", path="/analytics/totalFocusMinutes")],
        limitations=[],
    )

    with patch.object(workflow, "_run_agent", AsyncMock(return_value=invalid)):
        with patch(
            "app.agents.workflow.verify_coach_result",
            side_effect=[
                type("VerificationResult", (), {
                    "ok": False,
                    "failures": [
                        (
                            "UNSUPPORTED_NUMERIC_CLAIM:minutes:120:"
                            "claimed='2 hours':canonical=/analytics/totalFocusMinutes=101"
                        ),
                    ],
                    "resolved_evidence": [],
                })(),
                type("VerificationResult", (), {
                    "ok": False,
                    "failures": [
                        "NUMERIC_CLAIM_WITHOUT_EVIDENCE:count:999:999 sessions",
                    ],
                    "resolved_evidence": [],
                })(),
            ],
        ):
            with pytest.raises(VerificationFailedError):
                await workflow.run("How productive was I this week?", run_context)

    messages = capsys.readouterr().err
    assert "coach verification failed request_id=req-diagnostics-1 attempt=1" in messages
    assert "coach verification failed request_id=req-diagnostics-1 attempt=2" in messages
    assert "UNSUPPORTED_NUMERIC_CLAIM" in messages
    assert "NUMERIC_CLAIM_WITHOUT_EVIDENCE" in messages
    assert "/analytics/totalFocusMinutes" in messages
    assert "secret-access-token-should-not-appear" not in messages
    assert "secret task title Capstone" not in messages
    assert "Do the secret thing." not in messages
    assert "2 hours" not in messages
    assert "999 sessions" not in messages

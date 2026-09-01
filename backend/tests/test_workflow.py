from unittest.mock import AsyncMock, patch

import pytest

from app.agents.workflow import CoachWorkflow
from app.agents.context import CoachRunContext
from app.errors import VerificationFailedError
from app.models.evidence import CoachAgentResult, EvidenceClaim


@pytest.mark.asyncio
async def test_one_repair_attempt_maximum(settings):
    workflow = CoachWorkflow(settings)
    run_context = CoachRunContext(
        request_id="req-1",
        trace_id="trace_test",
        user_id="user-1",
        access_token="secret",
        analytics_service=AsyncMock(),
        task_service=AsyncMock(),
    )

    invalid = CoachAgentResult(
        answer="Based on your A.S.U.N.A. data, you completed 999 sessions.",
        recommendations=[],
        evidence=[EvidenceClaim(source="analytics", path="/analytics/missing")],
        limitations=[],
    )

    mock_run_agent = AsyncMock(return_value=invalid)
    with patch.object(workflow, "_run_agent", mock_run_agent):
        with pytest.raises(VerificationFailedError):
            await workflow.run("How productive was I?", run_context)

    assert mock_run_agent.await_count == 2

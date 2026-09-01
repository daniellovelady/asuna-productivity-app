from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr

from app.agents.context import AuthenticatedRequestContext, CoachRunContext, ToolStateRegistry
from app.dependencies import get_authenticated_context
from app.errors import AppError, VerificationFailedError
from app.models.evidence import CoachAgentResult, EvidenceClaim, VerifiedCoachResult


@pytest.fixture
def mock_request_context(settings):
    analytics = AsyncMock()
    analytics.fetch_snapshot = AsyncMock()
    tasks = AsyncMock()
    tasks.fetch_active_summary = AsyncMock()
    client = AsyncMock()
    return AuthenticatedRequestContext(
        request_id="req-1",
        user_id="user-1",
        access_token="secret-token",
        settings=settings,
        client=client,
        analytics_service=analytics,
        task_service=tasks,
    )


@pytest.mark.asyncio
async def test_missing_openai_key_returns_configuration_error(settings):
    settings.openai_api_key = None
    workflow = __import__("app.agents.workflow", fromlist=["CoachWorkflow"]).CoachWorkflow(
        settings
    )
    run_context = CoachRunContext(
        request_id="req-1",
        trace_id="trace_test",
        user_id="user-1",
        access_token="secret-token",
        analytics_service=AsyncMock(),
        task_service=AsyncMock(),
    )
    with patch("app.agents.workflow.Runner.run") as mock_runner:
        with pytest.raises(AppError) as exc:
            await workflow.run("How productive was I?", run_context)
        mock_runner.assert_not_called()
    assert exc.value.code == "configuration_error"
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_blank_openai_key_returns_configuration_error(settings):
    settings.openai_api_key = SecretStr("   ")
    workflow = __import__("app.agents.workflow", fromlist=["CoachWorkflow"]).CoachWorkflow(
        settings
    )
    run_context = CoachRunContext(
        request_id="req-1",
        trace_id="trace_test",
        user_id="user-1",
        access_token="secret-token",
        analytics_service=AsyncMock(),
        task_service=AsyncMock(),
    )
    with patch("app.agents.workflow.Runner.run") as mock_runner:
        with pytest.raises(AppError) as exc:
            await workflow.run("How productive was I?", run_context)
        mock_runner.assert_not_called()
    assert exc.value.code == "configuration_error"


@pytest.mark.asyncio
async def test_missing_openai_key_route_returns_503(app, mock_request_context, settings):
    settings.openai_api_key = None

    async def override_auth():
        mock_request_context.question = "How productive was I this week?"
        yield mock_request_context

    app.dependency_overrides[get_authenticated_context] = override_auth
    try:
        with patch("app.agents.workflow.Runner.run") as mock_runner:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.post(
                    "/v1/coach/analyze",
                    json={"question": "How productive was I this week?"},
                    headers={"Authorization": "Bearer valid-token"},
                )
            mock_runner.assert_not_called()
    finally:
        app.dependency_overrides.pop(get_authenticated_context, None)

    assert response.status_code == 503
    body = response.json()
    assert body["code"] == "configuration_error"
    assert "Coach AI service is not configured." in body["message"]


@pytest.mark.asyncio
async def test_successful_coach_route_with_mocked_runner(app, mock_request_context):
    agent_result = CoachAgentResult(
        answer="Based on your A.S.U.N.A. data, you focused for 101 minutes.",
        recommendations=["Take a short break."],
        evidence=[EvidenceClaim(source="analytics", path="/analytics/totalFocusMinutes")],
        limitations=[],
    )
    verified = VerifiedCoachResult(
        answer=agent_result.answer,
        recommendations=agent_result.recommendations,
        evidence=[],
        limitations=[],
    )
    workflow_result = MagicMock()
    workflow_result.agent_result = agent_result
    workflow_result.verified = verified
    workflow_result.tools_used = ["get_productivity_snapshot"]
    workflow_result.verification_status = "verified"
    workflow_result.repair_attempted = False

    async def override_auth():
        mock_request_context.question = "How productive was I?"
        yield mock_request_context

    app.dependency_overrides[get_authenticated_context] = override_auth
    try:
        with patch("app.routes.coach.CoachWorkflow") as mock_workflow_cls:
            mock_workflow = mock_workflow_cls.return_value
            mock_workflow.run = AsyncMock(return_value=workflow_result)
            mock_workflow.maybe_run_reviewer = AsyncMock()
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.post(
                    "/v1/coach/analyze",
                    json={"question": "How productive was I?"},
                    headers={"Authorization": "Bearer valid-token"},
                )
    finally:
        app.dependency_overrides.pop(get_authenticated_context, None)
    assert response.status_code == 200
    body = response.json()
    assert body["verification_status"] == "verified"
    assert body["result"] is not None
    assert body["error"] is None
    assert "secret-token" not in response.text


@pytest.mark.asyncio
async def test_verification_failed_returns_422(app, mock_request_context):
    async def override_auth():
        mock_request_context.question = "How productive was I?"
        yield mock_request_context

    app.dependency_overrides[get_authenticated_context] = override_auth
    try:
        with patch("app.routes.coach.CoachWorkflow") as mock_workflow_cls:
            mock_workflow = mock_workflow_cls.return_value
            mock_workflow.run = AsyncMock(
                side_effect=VerificationFailedError(
                    "Coach response could not be verified after one repair attempt."
                ),
            )
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.post(
                    "/v1/coach/analyze",
                    json={"question": "How productive was I?"},
                    headers={"Authorization": "Bearer valid-token"},
                )
    finally:
        app.dependency_overrides.pop(get_authenticated_context, None)

    assert response.status_code == 422
    body = response.json()
    assert body["verification_status"] == "repair_exhausted"
    assert body["result"] is None
    assert body["error"]["code"] == "verification_failed"
    assert "could not be verified" in body["error"]["message"]

import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch

from app.agents.context import AuthenticatedRequestContext, CoachRunContext, ToolStateRegistry
from app.agents.workflow import CoachWorkflow
from app.dependencies import get_authenticated_context
from app.models.evidence import CoachAgentResult
from app.verification.evidence_verifier import classify_question, verify_coach_result
from app.verification.mutation_claims import scan_mutation_claims
from app.verification.unsupported_mutation_requests import is_unsupported_mutation_request


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


@pytest.mark.parametrize(
    "question",
    [
        "Mark my highest priority task complete.",
        "Complete task 1.",
        "Delete my highest priority task.",
        "Create a task called Capstone.",
        "Start a focus session.",
        "Change my break duration to 10 minutes.",
    ],
)
def test_unsupported_mutation_requests_are_detected(question: str):
    assert is_unsupported_mutation_request(question) is True


@pytest.mark.parametrize(
    "question",
    [
        "What is my highest priority task?",
        "What should I work on next?",
        "How does task prioritization work?",
        "How productive was I this week?",
    ],
)
def test_read_only_questions_are_not_mutation_requests(question: str):
    assert is_unsupported_mutation_request(question) is False


def test_classify_question_for_mutation_request_does_not_require_tasks():
    plan = classify_question("Mark my highest priority task complete.")
    assert plan.requires_tasks is False
    assert plan.requires_analytics is False


def test_classify_question_for_read_only_task_question_requires_tasks():
    plan = classify_question("What is my highest priority task?")
    assert plan.requires_tasks is True


def test_classify_question_for_next_task_recommendation_requires_tasks():
    plan = classify_question("What should I work on next?")
    assert plan.requires_tasks is True


def test_classify_question_for_general_task_topic_does_not_require_tasks():
    plan = classify_question("How does task prioritization work?")
    assert plan.requires_tasks is False
    assert plan.requires_analytics is False


@pytest.mark.asyncio
async def test_workflow_short_circuits_mutation_request_without_runner(settings):
    workflow = CoachWorkflow(settings)
    run_context = CoachRunContext(
        request_id="req-mutation-1",
        trace_id="trace_test",
        user_id="user-1",
        access_token="secret-token",
        analytics_service=AsyncMock(),
        task_service=AsyncMock(),
    )

    with patch("app.agents.workflow.Runner.run") as mock_runner:
        result = await workflow.run(
            "Mark my highest priority task complete.",
            run_context,
        )

    mock_runner.assert_not_called()
    run_context.task_service.fetch_active_summary.assert_not_called()
    assert result.verification_status == "verified"
    assert result.tools_used == []
    assert "read-only access" in result.verified.answer.lower()
    assert result.verified.evidence == []
    assert result.verified.limitations


@pytest.mark.asyncio
async def test_mutation_refusal_succeeds_without_openai_key(settings):
    settings.openai_api_key = None
    workflow = CoachWorkflow(settings)
    run_context = CoachRunContext(
        request_id="req-mutation-2",
        trace_id="trace_test",
        user_id="user-1",
        access_token="secret-token",
        analytics_service=AsyncMock(),
        task_service=AsyncMock(),
    )

    with patch("app.agents.workflow.Runner.run") as mock_runner:
        result = await workflow.run("Complete task 1.", run_context)

    mock_runner.assert_not_called()
    assert result.verification_status == "verified"


def test_agent_generated_mutation_claim_still_fails_verification():
    registry = ToolStateRegistry()
    registry.record_success("get_active_tasks_summary", {"activeCount": 1, "items": []})
    result = CoachAgentResult(
        answer="Done, I marked it complete.",
        recommendations=[],
        evidence=[],
        limitations=[],
    )
    verification = verify_coach_result(
        result,
        registry,
        classify_question("Mark my highest priority task complete."),
    )
    assert verification.ok is False
    assert "MUTATION_CLAIM" in verification.failures
    assert scan_mutation_claims(result.answer)


@pytest.mark.asyncio
async def test_mutation_request_route_returns_verified_response(app, mock_request_context):
    async def override_auth():
        mock_request_context.question = "Mark my highest priority task complete."
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
                    json={"question": "Mark my highest priority task complete."},
                    headers={"Authorization": "Bearer valid-token"},
                )
            mock_runner.assert_not_called()
    finally:
        app.dependency_overrides.pop(get_authenticated_context, None)

    assert response.status_code == 200
    body = response.json()
    assert body["verification_status"] == "verified"
    assert body["tools_used"] == []
    assert body["error"] is None
    assert body["result"] is not None
    assert "read-only access" in body["result"]["answer"].lower()

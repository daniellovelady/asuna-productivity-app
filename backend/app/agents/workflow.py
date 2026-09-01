from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass

from agents import Runner

from app.agents.context import CoachRunContext
from app.agents.productivity_coach import build_productivity_coach
from app.agents.reviewer import build_reviewer_agent, build_reviewer_input
from app.agents.unsupported_mutation_refusal import (
    build_unsupported_mutation_refusal,
    build_verified_unsupported_mutation_refusal,
)
from app.config import Settings, get_settings, is_openai_configured
from app.errors import AppError, VerificationFailedError
from app.models.evidence import CoachAgentResult, VerifiedCoachResult
from app.tracing import build_run_config, create_trace_id
from app.verification.diagnostic_logging import (
    log_verification_failed,
    log_verification_passed,
)
from app.verification.evidence_verifier import (
    PlanRequirements,
    classify_question,
    verify_coach_result,
)
from app.verification.unsupported_mutation_requests import is_unsupported_mutation_request


def _format_repair_note(failures: list[str]) -> str:
    hints: list[str] = []
    for failure in failures:
        if failure.startswith("UNSUPPORTED_NUMERIC_CLAIM:minutes:"):
            hints.append(
                "The answer contains a personalized duration that does not match any cited "
                "analytics minute metric. Cite the matching focusByDay or totalFocusMinutes "
                "EvidenceClaim path, or omit the unsupported minute value."
            )
        elif failure.startswith("UNSUPPORTED_NUMERIC_CLAIM:count:"):
            hints.append(
                "The answer contains a personalized count that does not match cited analytics or task counts."
            )
        elif failure.startswith("UNSUPPORTED_NUMERIC_CLAIM:percent:"):
            hints.append(
                "The answer contains a personalized percentage that does not match cited analytics."
            )
        elif failure.startswith("UNRESOLVED_PATH:"):
            hints.append(f"Evidence path is invalid: {failure.removeprefix('UNRESOLVED_PATH:')}")
        elif failure.startswith("NUMERIC_CLAIM_WITHOUT_EVIDENCE:"):
            hints.append(
                "The answer contains a personalized number without supporting resolved evidence."
            )
        else:
            hints.append(failure)
    unique_hints = list(dict.fromkeys(hints))
    return (
        "Verification failed. Fix evidence paths and unsupported claims. "
        f"Failures: {'; '.join(unique_hints)}"
    )


@dataclass
class WorkflowResult:
    agent_result: CoachAgentResult
    verified: VerifiedCoachResult
    tools_used: list[str]
    verification_status: str
    repair_attempted: bool


class CoachWorkflow:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def _ensure_openai_key(self) -> None:
        if not is_openai_configured(self._settings):
            raise AppError(
                "configuration_error",
                "Coach AI service is not configured.",
                503,
            )
        os.environ["OPENAI_API_KEY"] = (
            self._settings.openai_api_key.get_secret_value()
        )

    def _map_runner_error(self, exc: Exception) -> AppError:
        message = str(exc).lower()
        if "rate limit" in message or "429" in message:
            return AppError(
                "rate_limited",
                "Coach is rate limited. Try again later.",
                429,
            )
        return AppError(
            "openai_unavailable",
            "The AI service is temporarily unavailable.",
            502,
        )

    async def _run_agent(
        self,
        question: str,
        run_context: CoachRunContext,
        *,
        repair_note: str | None = None,
    ) -> CoachAgentResult:
        agent = build_productivity_coach()
        prompt = question if repair_note is None else f"{question}\n\n{repair_note}"
        trace_id = run_context.trace_id
        run_config = build_run_config(trace_id, run_context.request_id)

        try:
            run_result = await asyncio.wait_for(
                Runner.run(
                    agent,
                    input=prompt,
                    context=run_context,
                    max_turns=self._settings.coach_max_turns,
                    run_config=run_config,
                ),
                timeout=self._settings.coach_agent_timeout_seconds,
            )
        except AppError:
            raise
        except Exception as exc:
            raise self._map_runner_error(exc) from exc

        final = run_result.final_output
        if not isinstance(final, CoachAgentResult):
            raise AppError(
                "openai_unavailable",
                "Coach returned an invalid response.",
                502,
            )
        return final

    async def run(
        self,
        question: str,
        run_context: CoachRunContext,
    ) -> WorkflowResult:
        if is_unsupported_mutation_request(question):
            agent_result = build_unsupported_mutation_refusal()
            verified = build_verified_unsupported_mutation_refusal()
            return WorkflowResult(
                agent_result=agent_result,
                verified=verified,
                tools_used=[],
                verification_status="verified",
                repair_attempted=False,
            )

        self._ensure_openai_key()
        plan: PlanRequirements = classify_question(question)
        repair_attempted = False
        repair_note: str | None = None

        for attempt in range(2):
            agent_result = await self._run_agent(
                question,
                run_context,
                repair_note=repair_note,
            )

            if plan.requires_analytics and run_context.tool_state.tool_failed(
                "get_productivity_snapshot"
            ):
                raise AppError(
                    "tool_failure",
                    "Productivity analytics are temporarily unavailable.",
                    503,
                )
            if plan.requires_tasks and run_context.tool_state.tool_failed(
                "get_active_tasks_summary"
            ):
                raise AppError(
                    "tool_failure",
                    "Active task data is temporarily unavailable.",
                    503,
                )

            verification = verify_coach_result(
                agent_result,
                run_context.tool_state,
                plan,
            )

            attempt_number = attempt + 1

            if verification.ok:
                log_verification_passed(run_context.request_id, attempt_number)
                verified = VerifiedCoachResult(
                    answer=agent_result.answer,
                    recommendations=agent_result.recommendations,
                    evidence=verification.resolved_evidence,
                    limitations=agent_result.limitations,
                )
                return WorkflowResult(
                    agent_result=agent_result,
                    verified=verified,
                    tools_used=run_context.tool_state.tools_used(),
                    verification_status="verified",
                    repair_attempted=repair_attempted,
                )

            log_verification_failed(
                run_context.request_id,
                attempt_number,
                verification.failures,
                evidence_paths=[claim.path for claim in agent_result.evidence],
            )

            if attempt == 0:
                repair_attempted = True
                repair_note = _format_repair_note(verification.failures)
                continue

        raise VerificationFailedError(
            "Coach response could not be verified after one repair attempt."
        )

    async def maybe_run_reviewer(
        self,
        agent_result: CoachAgentResult,
        verified: VerifiedCoachResult,
    ) -> None:
        if not self._settings.enable_reviewer_agent:
            return
        self._ensure_openai_key()
        reviewer = build_reviewer_agent(self._settings.openai_model)
        await Runner.run(
            reviewer,
            input=build_reviewer_input(agent_result, verified.evidence),
        )


def create_run_context(
    request_ctx,
    access_token: str,
) -> CoachRunContext:
    from app.agents.context import CoachRunContext

    trace_id = create_trace_id()
    return CoachRunContext.from_request(request_ctx, trace_id, access_token)

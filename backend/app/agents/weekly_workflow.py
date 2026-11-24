from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass

from agents import Runner

from app.agents.context import AuthenticatedRequestContext
from app.agents.weekly_insights_agent import build_weekly_insights_agent
from app.config import Settings, get_settings, is_openai_configured
from app.errors import AnalyticsServiceError, AppError, VerificationFailedError
from app.models.evidence import ResolvedEvidence
from app.models.weekly_insight import (
    ReportPeriod,
    ResolvedInsightItem,
    WeeklyInsightAgentResult,
    WeeklyInsightReport,
    utc_now_iso,
)
from app.tracing import build_run_config, create_trace_id
from app.verification.confidence import compute_data_confidence
from app.verification.weekly_report_verifier import verify_weekly_report


def _format_weekly_repair_note(failures: list[str]) -> str:
    return (
        "Verification failed. Fix evidence paths and unsupported numeric claims. "
        f"Failures: {'; '.join(failures)}"
    )


@dataclass
class WeeklyWorkflowResult:
    report: WeeklyInsightReport
    verification_status: str
    repair_attempted: bool


class WeeklyInsightWorkflow:
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
                "Weekly report is rate limited. Try again later.",
                429,
            )
        return AppError(
            "openai_unavailable",
            "The AI service is temporarily unavailable.",
            502,
        )

    async def _run_agent(
        self,
        snapshot_json: str,
        request_ctx: AuthenticatedRequestContext,
        *,
        repair_note: str | None = None,
    ) -> WeeklyInsightAgentResult:
        agent = build_weekly_insights_agent()
        prompt = (
            "Generate a weekly productivity insight report from this AnalyticsSnapshot:\n"
            f"{snapshot_json}"
        )
        if repair_note is not None:
            prompt = f"{prompt}\n\n{repair_note}"

        trace_id = create_trace_id()
        run_config = build_run_config(trace_id, request_ctx.request_id)

        try:
            run_result = await asyncio.wait_for(
                Runner.run(
                    agent,
                    input=prompt,
                    max_turns=1,
                    run_config=run_config,
                ),
                timeout=self._settings.coach_agent_timeout_seconds,
            )
        except Exception as exc:
            raise self._map_runner_error(exc) from exc

        final = run_result.final_output
        if not isinstance(final, WeeklyInsightAgentResult):
            raise AppError(
                "openai_unavailable",
                "Weekly report returned an invalid response.",
                502,
            )
        return final

    def _build_report(
        self,
        agent_result: WeeklyInsightAgentResult,
        verification,
        snapshot,
    ) -> WeeklyInsightReport:
        def map_items(
            section: str,
        ) -> list[ResolvedInsightItem]:
            return [
                ResolvedInsightItem(text=text, evidence=evidence)
                for text, evidence in verification.resolved_items.get(section, [])
            ]

        summary_items = verification.resolved_items.get("summary", [])
        summary = ResolvedInsightItem(
            text=summary_items[0][0],
            evidence=summary_items[0][1],
        ) if summary_items else ResolvedInsightItem(
            text=agent_result.summary.text,
            evidence=[],
        )

        return WeeklyInsightReport(
            report_period=ReportPeriod(
                start=snapshot.range.start,
                end=snapshot.range.end,
                timezone=snapshot.range.timezone,
            ),
            summary=summary,
            strengths=map_items("strengths"),
            observations=map_items("observations"),
            recommendations=map_items("recommendations"),
            data_confidence=compute_data_confidence(snapshot),
            limitations=agent_result.limitations,
            generated_at=utc_now_iso(),
        )

    async def run(
        self,
        request_ctx: AuthenticatedRequestContext,
    ) -> WeeklyWorkflowResult:
        self._ensure_openai_key()

        try:
            snapshot = await request_ctx.analytics_service.fetch_snapshot()
        except AnalyticsServiceError as exc:
            raise AppError(
                "tool_failure",
                "Productivity analytics are temporarily unavailable.",
                503,
            ) from exc

        analytics_payload = snapshot.to_evidence_payload()
        snapshot_json = json.dumps(analytics_payload, separators=(",", ":"))
        repair_attempted = False
        repair_note: str | None = None

        for attempt in range(2):
            agent_result = await self._run_agent(
                snapshot_json,
                request_ctx,
                repair_note=repair_note,
            )

            verification = verify_weekly_report(agent_result, analytics_payload)

            if verification.ok:
                return WeeklyWorkflowResult(
                    report=self._build_report(agent_result, verification, snapshot),
                    verification_status="verified",
                    repair_attempted=repair_attempted,
                )

            if attempt == 0:
                repair_attempted = True
                repair_note = _format_weekly_repair_note(verification.failures)
                continue

        raise VerificationFailedError(
            "Weekly report could not be verified after one repair attempt."
        )

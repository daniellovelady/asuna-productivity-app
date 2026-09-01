from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.agents.context import ToolStateRegistry
from app.models.evidence import CoachAgentResult, EvidenceClaim, ResolvedEvidence
from app.verification.answer_claims import verify_numeric_claims
from app.verification.mutation_claims import scan_mutation_claims
from app.verification.path_resolver import resolve_path_value, values_match
from app.verification.unsupported_mutation_requests import is_unsupported_mutation_request

READ_ONLY_TASK_PATTERNS = (
    re.compile(r"\bwhat(?:'s| is)\s+my\b", re.IGNORECASE),
    re.compile(r"\bwhich\s+task\b", re.IGNORECASE),
    re.compile(r"\bwhat\s+should\s+i\s+(?:work\s+on|do)\b", re.IGNORECASE),
    re.compile(r"\bshow\s+my\s+tasks?\b", re.IGNORECASE),
    re.compile(r"\blist\s+my\s+tasks?\b", re.IGNORECASE),
    re.compile(r"\bhow\s+many\s+(?:active\s+)?tasks?\b", re.IGNORECASE),
)


@dataclass
class PlanRequirements:
    requires_analytics: bool = False
    requires_tasks: bool = False


@dataclass
class VerificationResult:
    ok: bool
    resolved_evidence: list[ResolvedEvidence] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)


def classify_question(question: str) -> PlanRequirements:
    if is_unsupported_mutation_request(question):
        return PlanRequirements(requires_analytics=False, requires_tasks=False)

    lowered = question.lower()
    requires_analytics = any(
        token in lowered
        for token in (
            "productive",
            "productivity",
            "focus",
            "session",
            "distract",
            "distraction",
            "break",
            "interruption",
            "analytics",
            "statistics",
            "stats",
            "minutes",
            "hour",
        )
    )
    requires_tasks = any(pattern.search(question) for pattern in READ_ONLY_TASK_PATTERNS)
    return PlanRequirements(
        requires_analytics=requires_analytics,
        requires_tasks=requires_tasks,
    )


def verify_coach_result(
    result: CoachAgentResult,
    tool_state: ToolStateRegistry,
    plan: PlanRequirements,
) -> VerificationResult:
    failures: list[str] = []
    resolved: list[ResolvedEvidence] = []

    if plan.requires_analytics and not tool_state.tool_succeeded("get_productivity_snapshot"):
        failures.append("REQUIRED_ANALYTICS_UNAVAILABLE")
    if plan.requires_tasks and not tool_state.tool_succeeded("get_active_tasks_summary"):
        failures.append("REQUIRED_TASKS_UNAVAILABLE")

    for claim in result.evidence:
        resolved_value = resolve_path_value(claim.source, claim.path, tool_state)
        if resolved_value is None:
            failures.append(f"UNRESOLVED_PATH:{claim.source}:{claim.path}")
            continue
        resolved.append(
            ResolvedEvidence(
                source=claim.source,
                path=claim.path,
                value=resolved_value,
            )
        )

    if scan_mutation_claims(result.answer, *result.recommendations):
        failures.append("MUTATION_CLAIM")

    failures.extend(verify_numeric_claims(result.answer, resolved))

    for claim in result.evidence:
        resolved_value = resolve_path_value(claim.source, claim.path, tool_state)
        if resolved_value is None:
            continue
        for other in resolved:
            if other.path == claim.path and other.source == claim.source:
                if not values_match(other.value, resolved_value):
                    failures.append(f"EVIDENCE_INTERNAL_MISMATCH:{claim.path}")

    return VerificationResult(
        ok=len(failures) == 0,
        resolved_evidence=resolved,
        failures=failures,
    )


def build_verified_result(
    result: CoachAgentResult,
    resolved_evidence: list[ResolvedEvidence],
) -> dict:
    return {
        "answer": result.answer,
        "recommendations": result.recommendations,
        "evidence": [item.model_dump() for item in resolved_evidence],
        "limitations": result.limitations,
    }

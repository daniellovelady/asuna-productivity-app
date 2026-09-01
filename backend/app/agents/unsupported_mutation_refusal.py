from __future__ import annotations

from app.models.evidence import CoachAgentResult, VerifiedCoachResult

READ_ONLY_REFUSAL_ANSWER = (
    "I can't complete or modify tasks because the Insights Coach currently has "
    "read-only access."
)
READ_ONLY_REFUSAL_RECOMMENDATION = (
    "Use the Tasks page in A.S.U.N.A. to complete or update tasks."
)
READ_ONLY_REFUSAL_LIMITATION = (
    "The Insights Coach cannot create, edit, complete, or delete tasks."
)


def build_unsupported_mutation_refusal() -> CoachAgentResult:
    return CoachAgentResult(
        answer=READ_ONLY_REFUSAL_ANSWER,
        recommendations=[READ_ONLY_REFUSAL_RECOMMENDATION],
        evidence=[],
        limitations=[READ_ONLY_REFUSAL_LIMITATION],
    )


def build_verified_unsupported_mutation_refusal() -> VerifiedCoachResult:
    result = build_unsupported_mutation_refusal()
    return VerifiedCoachResult(
        answer=result.answer,
        recommendations=result.recommendations,
        evidence=[],
        limitations=result.limitations,
    )

from agents import Agent

from app.models.evidence import CoachAgentResult, ResolvedEvidence

REVIEWER_INSTRUCTIONS = """You review a productivity coach response for factual alignment with evidence.
You have no tools and cannot access user credentials or raw databases.
Flag factual errors, missed caveats, and unsupported claims.
Return a short structured assessment only.
"""


def build_reviewer_agent(model: str) -> Agent:
    return Agent(
        name="ReviewerAgent",
        instructions=REVIEWER_INSTRUCTIONS,
        model=model,
        output_type=CoachAgentResult,
    )


def build_reviewer_input(
    result: CoachAgentResult,
    evidence: list[ResolvedEvidence],
) -> str:
    evidence_lines = [
        f"{item.source} {item.path} = {item.value}" for item in evidence
    ]
    return (
        "Coach answer:\n"
        f"{result.answer}\n\n"
        "Resolved evidence:\n"
        + "\n".join(evidence_lines)
    )

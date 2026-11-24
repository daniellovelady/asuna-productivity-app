from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.models.evidence import EvidenceClaim, ResolvedEvidence
from app.models.weekly_insight import InsightItem, WeeklyInsightAgentResult
from app.verification.answer_claims import verify_numeric_claims
from app.verification.mutation_claims import scan_mutation_claims
from app.verification.path_resolver import resolve_path_value, values_match


@dataclass
class WeeklyVerificationResult:
    ok: bool
    resolved_items: dict[str, list[tuple[str, list[ResolvedEvidence]]]] = field(
        default_factory=dict,
    )
    failures: list[str] = field(default_factory=list)


def _resolve_item_evidence(
    item: InsightItem,
    payload: dict[str, Any],
) -> tuple[list[ResolvedEvidence], list[str]]:
    resolved: list[ResolvedEvidence] = []
    failures: list[str] = []

    for claim in item.evidence:
        if claim.source != "analytics":
            failures.append(f"UNSUPPORTED_SOURCE:{claim.source}")
            continue

        value = resolve_path_value(claim.source, claim.path, _PayloadRegistry(payload))
        if value is None:
            failures.append(f"UNRESOLVED_PATH:{claim.source}:{claim.path}")
            continue

        resolved.append(
            ResolvedEvidence(
                source=claim.source,
                path=claim.path,
                value=value,
            )
        )

    failures.extend(verify_numeric_claims(item.text, resolved))

    return resolved, failures


class _PayloadRegistry:
    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload

    def get_payload(self, source: str) -> dict[str, Any] | None:
        if source == "analytics":
            return self._payload
        return None


def verify_weekly_report(
    result: WeeklyInsightAgentResult,
    analytics_payload: dict[str, Any],
) -> WeeklyVerificationResult:
    failures: list[str] = []
    resolved_items: dict[str, list[tuple[str, list[ResolvedEvidence]]]] = {}

    sections: list[tuple[str, list[InsightItem]]] = [
        ("summary", [result.summary]),
        ("strengths", result.strengths),
        ("observations", result.observations),
        ("recommendations", result.recommendations),
    ]

    for section_name, items in sections:
        section_resolved: list[tuple[str, list[ResolvedEvidence]]] = []
        for index, item in enumerate(items):
            if len(item.evidence) < 1:
                failures.append(f"MISSING_EVIDENCE:{section_name}:{index}")
                continue

            resolved, item_failures = _resolve_item_evidence(item, analytics_payload)
            failures.extend(
                f"{failure}:{section_name}:{index}" for failure in item_failures
            )
            section_resolved.append((item.text, resolved))

            for claim in item.evidence:
                resolved_value = resolve_path_value(
                    claim.source,
                    claim.path,
                    _PayloadRegistry(analytics_payload),
                )
                if resolved_value is None:
                    continue
                for other in resolved:
                    if other.path == claim.path and other.source == claim.source:
                        if not values_match(other.value, resolved_value):
                            failures.append(
                                f"NUMERIC_CONTRADICTION:{section_name}:{index}:{claim.path}"
                            )

        resolved_items[section_name] = section_resolved

    all_texts = [result.summary.text]
    all_texts.extend(item.text for item in result.strengths)
    all_texts.extend(item.text for item in result.observations)
    all_texts.extend(item.text for item in result.recommendations)

    if scan_mutation_claims(*all_texts):
        failures.append("MUTATION_CLAIM")

    return WeeklyVerificationResult(
        ok=len(failures) == 0,
        resolved_items=resolved_items,
        failures=failures,
    )

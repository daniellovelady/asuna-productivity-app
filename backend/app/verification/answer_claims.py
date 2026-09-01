from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from app.models.evidence import ResolvedEvidence
from app.verification.date_literals import collect_date_literal_spans

ClaimKind = Literal["minutes", "count", "percent", "raw"]

PERSONALIZED_HINTS = re.compile(
    r"\b(you|your|you've|you have)\b",
    re.IGNORECASE,
)

HOUR_AND_MINUTE = re.compile(
    r"(?P<hours>\d+)\s*(?:hours?|hrs?)\s*(?:and\s+)?(?P<minutes>\d+)\s*(?:minutes?|mins?|m)\b",
    re.IGNORECASE,
)
SHORT_HOUR_AND_MINUTE = re.compile(
    r"(?P<hours>\d+)\s*h(?:ours?)?\s*(?P<minutes>\d+)\s*m(?:in(?:ute)?s?)?\b",
    re.IGNORECASE,
)
DECIMAL_HOURS = re.compile(
    r"(?P<hours>\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b",
    re.IGNORECASE,
)
SHORT_DECIMAL_HOURS = re.compile(
    r"(?P<hours>\d+(?:\.\d+)?)\s*h(?:ours?)?\b",
    re.IGNORECASE,
)
MINUTES_ONLY = re.compile(
    r"(?P<minutes>\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b",
    re.IGNORECASE,
)
SHORT_MINUTES_ONLY = re.compile(
    r"(?P<minutes>\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?\b",
    re.IGNORECASE,
)
SESSION_COUNT = re.compile(
    r"(?P<count>\d+)\s+(?:completed\s+)?sessions?\b",
    re.IGNORECASE,
)
INTERRUPTION_COUNT = re.compile(
    r"(?P<count>\d+)\s+interruptions?\b",
    re.IGNORECASE,
)
TASK_COUNT = re.compile(
    r"(?P<count>\d+)\s+(?:active\s+)?tasks?\b",
    re.IGNORECASE,
)
PERCENT_VALUE = re.compile(
    r"(?P<percent>\d+(?:\.\d+)?)\s*(?:%|percent)(?!\w)",
    re.IGNORECASE,
)
RAW_NUMBER = re.compile(
    r"(?<!\w)(\d+(?:\.\d+)?)(?!\w)",
)


@dataclass(frozen=True)
class NumericClaim:
    kind: ClaimKind
    value: float
    span: tuple[int, int]
    label: str


def _overlaps(span: tuple[int, int], consumed: list[tuple[int, int]]) -> bool:
    start, end = span
    return any(not (end <= other_start or start >= other_end) for other_start, other_end in consumed)


def _add_claim(
    claims: list[NumericClaim],
    consumed: list[tuple[int, int]],
    *,
    kind: ClaimKind,
    value: float,
    span: tuple[int, int],
    label: str,
) -> None:
    if _overlaps(span, consumed):
        return
    claims.append(NumericClaim(kind=kind, value=value, span=span, label=label))
    consumed.append(span)


def extract_numeric_claims(answer: str) -> list[NumericClaim]:
    if not PERSONALIZED_HINTS.search(answer):
        return []

    claims: list[NumericClaim] = []
    consumed: list[tuple[int, int]] = list(collect_date_literal_spans(answer))

    for pattern, kind, builder in (
        (HOUR_AND_MINUTE, "minutes", lambda m: int(m.group("hours")) * 60 + int(m.group("minutes"))),
        (SHORT_HOUR_AND_MINUTE, "minutes", lambda m: int(m.group("hours")) * 60 + int(m.group("minutes"))),
        (DECIMAL_HOURS, "minutes", lambda m: float(m.group("hours")) * 60),
        (SHORT_DECIMAL_HOURS, "minutes", lambda m: float(m.group("hours")) * 60),
        (MINUTES_ONLY, "minutes", lambda m: float(m.group("minutes"))),
        (SHORT_MINUTES_ONLY, "minutes", lambda m: float(m.group("minutes"))),
        (SESSION_COUNT, "count", lambda m: float(m.group("count"))),
        (INTERRUPTION_COUNT, "count", lambda m: float(m.group("count"))),
        (TASK_COUNT, "count", lambda m: float(m.group("count"))),
        (PERCENT_VALUE, "percent", lambda m: float(m.group("percent"))),
    ):
        for match in pattern.finditer(answer):
            span = match.span()
            if _overlaps(span, consumed):
                continue
            value = builder(match)
            _add_claim(
                claims,
                consumed,
                kind=kind,
                value=value,
                span=span,
                label=match.group(0),
            )

    for match in RAW_NUMBER.finditer(answer):
        span = match.span()
        if _overlaps(span, consumed):
            continue
        value = float(match.group(1))
        _add_claim(
            claims,
            consumed,
            kind="raw",
            value=value,
            span=span,
            label=match.group(0),
        )

    return claims


def path_kind(path: str) -> ClaimKind | Literal["other"]:
    if path.endswith("breakCompliancePercent"):
        return "percent"
    if path.endswith(
        ("completedSessions", "interruptionCount", "activeCount", "returnedCount")
    ):
        return "count"
    if (
        "focusMinutes" in path
        or path.endswith(
            ("totalFocusMinutes", "focusTodayMinutes", "averageSessionMinutes", "estimatedMinutes")
        )
    ):
        return "minutes"
    return "other"


def _values_equivalent(claim: float, canonical: float, kind: ClaimKind) -> bool:
    if kind == "count":
        return claim == canonical
    if kind == "percent":
        return abs(claim - canonical) <= 0.1
    if kind == "minutes":
        if abs(claim - canonical) <= 0.1:
            return True
        if claim == int(claim) and abs(claim - canonical) <= 0.5:
            return True
        return False
    return abs(claim - canonical) <= 0.1


def _resolved_values_for_kind(
    resolved_evidence: list[ResolvedEvidence],
    kind: ClaimKind,
) -> list[tuple[str, float]]:
    values: list[tuple[str, float]] = []
    for item in resolved_evidence:
        item_kind = path_kind(item.path)
        if kind == "raw" or item_kind == kind:
            try:
                values.append((item.path, float(item.value)))
            except ValueError:
                continue
    return values


def verify_numeric_claims(
    answer: str,
    resolved_evidence: list[ResolvedEvidence],
    *,
    float_tolerance: float = 0.1,
) -> list[str]:
    del float_tolerance  # tolerance handled in _values_equivalent
    failures: list[str] = []
    claims = extract_numeric_claims(answer)

    for claim in claims:
        candidates = _resolved_values_for_kind(resolved_evidence, claim.kind)
        if not candidates:
            failures.append(
                f"NUMERIC_CLAIM_WITHOUT_EVIDENCE:{claim.kind}:{claim.value}:{claim.label}"
            )
            continue

        matched = any(
            _values_equivalent(claim.value, canonical, claim.kind)
            for _path, canonical in candidates
        )
        if not matched:
            canonical_summary = ", ".join(
                f"{path}={value}" for path, value in candidates
            )
            failures.append(
                "UNSUPPORTED_NUMERIC_CLAIM:"
                f"{claim.kind}:{claim.value}:claimed={claim.label!r}:canonical={canonical_summary}"
            )

    return failures

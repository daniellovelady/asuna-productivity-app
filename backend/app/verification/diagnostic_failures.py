from __future__ import annotations

import re
from typing import Any

_UNSUPPORTED_NUMERIC_CLAIM = re.compile(
    r"^UNSUPPORTED_NUMERIC_CLAIM:(?P<claim_type>[^:]+):(?P<claimed>[^:]+):"
    r"claimed=(?P<claimed_label>.*?):canonical=(?P<canonical>.+)$"
)
_NUMERIC_CLAIM_WITHOUT_EVIDENCE = re.compile(
    r"^NUMERIC_CLAIM_WITHOUT_EVIDENCE:(?P<claim_type>[^:]+):(?P<claimed>[^:]+):"
)
_UNRESOLVED_PATH = re.compile(r"^UNRESOLVED_PATH:(?P<source>[^:]+):(?P<path>.+)$")
_EVIDENCE_INTERNAL_MISMATCH = re.compile(r"^EVIDENCE_INTERNAL_MISMATCH:(?P<path>.+)$")
_CANONICAL_PAIR = re.compile(r"(?P<path>/[^=]+)=(?P<value>[^,]+)")


def _parse_numeric(value: str) -> int | float:
    parsed = float(value)
    if parsed == int(parsed):
        return int(parsed)
    return parsed


def _first_canonical_pair(canonical_summary: str) -> tuple[str | None, int | float | None]:
    match = _CANONICAL_PAIR.search(canonical_summary)
    if not match:
        return None, None
    return match.group("path"), _parse_numeric(match.group("value"))


def sanitize_verification_failure(failure: str) -> dict[str, Any]:
    if failure in {
        "REQUIRED_ANALYTICS_UNAVAILABLE",
        "REQUIRED_TASKS_UNAVAILABLE",
        "MUTATION_CLAIM",
    }:
        return {"code": failure}

    unresolved_match = _UNRESOLVED_PATH.match(failure)
    if unresolved_match:
        return {
            "code": "UNRESOLVED_PATH",
            "path": unresolved_match.group("path"),
        }

    mismatch_match = _EVIDENCE_INTERNAL_MISMATCH.match(failure)
    if mismatch_match:
        return {
            "code": "EVIDENCE_INTERNAL_MISMATCH",
            "path": mismatch_match.group("path"),
        }

    without_evidence_match = _NUMERIC_CLAIM_WITHOUT_EVIDENCE.match(failure)
    if without_evidence_match:
        return {
            "code": "NUMERIC_CLAIM_WITHOUT_EVIDENCE",
            "claim_type": without_evidence_match.group("claim_type"),
            "claimed": _parse_numeric(without_evidence_match.group("claimed")),
            "path": None,
        }

    unsupported_match = _UNSUPPORTED_NUMERIC_CLAIM.match(failure)
    if unsupported_match:
        path, canonical = _first_canonical_pair(unsupported_match.group("canonical"))
        entry: dict[str, Any] = {
            "code": "UNSUPPORTED_NUMERIC_CLAIM",
            "claim_type": unsupported_match.group("claim_type"),
            "claimed": _parse_numeric(unsupported_match.group("claimed")),
            "path": path,
        }
        if canonical is not None:
            entry["canonical"] = canonical
        return entry

    return {"code": failure}


def sanitize_verification_failures(failures: list[str]) -> list[dict[str, Any]]:
    return [sanitize_verification_failure(failure) for failure in failures]

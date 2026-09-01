from __future__ import annotations

import re

MUTATION_PATTERNS = [
    re.compile(r"\bi(?:'ve| have)?\s+marked\b", re.IGNORECASE),
    re.compile(r"\bi(?:'ve| have)?\s+completed\b", re.IGNORECASE),
    re.compile(r"\bi(?:'ve| have)?\s+started\b", re.IGNORECASE),
    re.compile(r"\bi(?:'ve| have)?\s+deleted\b", re.IGNORECASE),
    re.compile(r"\bi(?:'ve| have)?\s+updated\b", re.IGNORECASE),
    re.compile(r"\btask (?:is|has been) (?:marked )?complete\b", re.IGNORECASE),
    re.compile(r"\bdone\s*[—-]\s*i(?:'ve| have)?\b", re.IGNORECASE),
    re.compile(r"\bsuccessfully (?:marked|completed|started|deleted|updated)\b", re.IGNORECASE),
]


def contains_mutation_claim(text: str) -> bool:
    return any(pattern.search(text) for pattern in MUTATION_PATTERNS)


def scan_mutation_claims(*texts: str) -> bool:
    return any(contains_mutation_claim(text) for text in texts if text)

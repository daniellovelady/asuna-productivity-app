from __future__ import annotations

import re

# Imperative user requests to mutate app state outside read-only coach permissions.
MUTATION_REQUEST_PATTERNS = [
    re.compile(r"\bmark\b.{0,120}\b(?:as\s+)?complete\b", re.IGNORECASE),
    re.compile(r"\bcomplete\s+(?:my\s+)?task\b", re.IGNORECASE),
    re.compile(r"\bdelete\b.{0,80}\btask\b", re.IGNORECASE),
    re.compile(r"\bremove\b.{0,80}\btask\b", re.IGNORECASE),
    re.compile(r"\bcreate\s+(?:a\s+)?task\b", re.IGNORECASE),
    re.compile(r"\badd\s+(?:a\s+)?task\b", re.IGNORECASE),
    re.compile(r"\bstart\s+(?:a\s+)?focus\s+session\b", re.IGNORECASE),
    re.compile(r"\b(?:change|set|update)\b.{0,80}\bbreak\b", re.IGNORECASE),
    re.compile(r"\b(?:change|set|update)\b.{0,80}\bduration\b", re.IGNORECASE),
    re.compile(r"\bupdate\b.{0,80}\btask\b", re.IGNORECASE),
]

_EDUCATIONAL_QUESTION = re.compile(
    r"^(?:how|what|can|could|is there|where)\b",
    re.IGNORECASE,
)


def is_unsupported_mutation_request(question: str) -> bool:
    stripped = question.strip()
    if not stripped:
        return False

    lowered = stripped.lower()
    if not any(pattern.search(lowered) for pattern in MUTATION_REQUEST_PATTERNS):
        return False

    if stripped.endswith("?") and _EDUCATIONAL_QUESTION.match(lowered):
        return False

    return True

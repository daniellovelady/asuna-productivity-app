from __future__ import annotations

import re

_MONTH = (
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|"
    r"Dec(?:ember)?)"
)
_DAY_SUFFIX = r"(?:st|nd|rd|th)?"
_MONTH_DAY = re.compile(
    rf"\b{_MONTH}\.?\s+(?P<day>\d{{1,2}}){_DAY_SUFFIX}\b",
    re.IGNORECASE,
)
_ISO_DATE = re.compile(r"\b(?P<full>\d{4}-\d{2}-\d{2})\b")
_ISO_DATE_SLASH = re.compile(r"\b(?P<full>\d{4}/\d{2}/\d{2})\b")
_DATE_RANGE = re.compile(
    rf"\b{_MONTH}\.?\s+\d{{1,2}}{_DAY_SUFFIX}?\s*"
    rf"(?:through|to)\s+"
    rf"{_MONTH}\.?\s+\d{{1,2}}{_DAY_SUFFIX}?\b",
    re.IGNORECASE,
)
_DATE_RANGE_DASH = re.compile(
    rf"\b{_MONTH}\.?\s+\d{{1,2}}{_DAY_SUFFIX}?\s*[-–—]\s*"
    rf"{_MONTH}\.?\s+\d{{1,2}}{_DAY_SUFFIX}?\b",
    re.IGNORECASE,
)


def _merge_spans(spans: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if not spans:
        return []
    ordered = sorted(spans)
    merged: list[tuple[int, int]] = [ordered[0]]
    for start, end in ordered[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged


def collect_date_literal_spans(text: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []

    for pattern in (_DATE_RANGE, _DATE_RANGE_DASH, _ISO_DATE, _ISO_DATE_SLASH, _MONTH_DAY):
        for match in pattern.finditer(text):
            spans.append(match.span())

    return _merge_spans(spans)

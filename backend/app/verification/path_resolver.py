from __future__ import annotations

import re
from typing import Any

from app.agents.context import ToolStateRegistry

SOURCE_PREFIX = {
    "analytics": "/analytics/",
    "tasks": "/tasks/",
}


def canonical_string(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float):
        return f"{value:.1f}".rstrip("0").rstrip(".") if value % 1 else str(int(value))
    return str(value)


def resolve_path_value(
    source: str,
    path: str,
    registry: ToolStateRegistry,
) -> str | None:
    prefix = SOURCE_PREFIX.get(source)
    if prefix is None or not path.startswith(prefix):
        return None

    payload = registry.get_payload(source)
    if payload is None:
        return None

    relative = path[len(prefix) :]
    if not relative:
        return None

    current: Any = payload
    for part in relative.split("/"):
        if isinstance(current, list):
            if not part.isdigit():
                return None
            index = int(part)
            if index < 0 or index >= len(current):
                return None
            current = current[index]
        elif isinstance(current, dict):
            if part not in current:
                return None
            current = current[part]
        else:
            return None

    return canonical_string(current)


def values_match(expected: str, actual: str, *, float_tolerance: float = 0.1) -> bool:
    if expected == actual:
        return True
    try:
        expected_num = float(expected)
        actual_num = float(actual)
        return abs(expected_num - actual_num) <= float_tolerance
    except ValueError:
        return False

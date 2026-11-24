from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ReminderTone = Literal["gentle", "neutral", "direct"]

ALLOWED_TRIGGER_KEYS = frozenset({
    "encouragement",
    "break-productive",
    "break-focus",
    "break-distracting",
    "distraction-15",
    "distraction-30",
    "distraction-60",
    "task-reminder",
    "celebration",
})

PLACEHOLDER_PATTERN = re.compile(r"\{[a-zA-Z]+\}")


class VaryMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trigger_key: str = Field(min_length=1, max_length=64)
    tone: ReminderTone
    template: str = Field(min_length=1, max_length=500)


class VaryMessageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template: str = Field(min_length=1, max_length=500)


class VaryMessageAgentResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    template: str = Field(min_length=1, max_length=500)


def extract_placeholders(template: str) -> set[str]:
    return set(PLACEHOLDER_PATTERN.findall(template))


def validate_placeholder_preservation(
    original: str,
    varied: str,
) -> bool:
    return extract_placeholders(original) == extract_placeholders(varied)

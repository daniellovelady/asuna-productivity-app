from __future__ import annotations

import asyncio
import os
import re

from agents import Agent, Runner

from app.config import Settings, get_settings, is_openai_configured
from app.errors import AppError
from app.models.assistant_message import (
    ALLOWED_TRIGGER_KEYS,
    VaryMessageAgentResult,
    VaryMessageRequest,
    VaryMessageResponse,
    extract_placeholders,
    validate_placeholder_preservation,
)

VARIATION_INSTRUCTIONS = """You rewrite assistant reminder templates in the requested tone.

Rules:
- Preserve the EXACT same placeholder tokens (e.g. {app}, {minutes}, {taskCount}, {breakMinutes}).
- Do not add or remove placeholders.
- Do not include personalized values; only vary wording around placeholders.
- Keep output concise.
"""

PLACEHOLDER_SYNTAX = re.compile(r"^\{[a-zA-Z]+\}$")


def _validate_template_syntax(template: str) -> None:
    for match in re.findall(r"\{[^}]+\}", template):
        if not PLACEHOLDER_SYNTAX.match(match):
            raise AppError(
                "invalid_request",
                "Template contains invalid placeholder syntax.",
                422,
            )


class MessageVariationService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def _ensure_openai_key(self) -> None:
        if not is_openai_configured(self._settings):
            raise AppError(
                "configuration_error",
                "Coach AI service is not configured.",
                503,
            )
        os.environ["OPENAI_API_KEY"] = (
            self._settings.openai_api_key.get_secret_value()
        )

    def _map_runner_error(self, exc: Exception) -> AppError:
        message = str(exc).lower()
        if "rate limit" in message or "429" in message:
            return AppError(
                "rate_limited",
                "Message variation is rate limited.",
                429,
            )
        return AppError(
            "openai_unavailable",
            "The AI service is temporarily unavailable.",
            502,
        )

    def validate_request(self, request: VaryMessageRequest) -> None:
        if request.trigger_key not in ALLOWED_TRIGGER_KEYS:
            raise AppError("invalid_request", "Invalid trigger key.", 422)
        _validate_template_syntax(request.template)

    async def vary(self, request: VaryMessageRequest) -> VaryMessageResponse:
        self.validate_request(request)
        self._ensure_openai_key()

        agent = Agent(
            name="MessageVariation",
            instructions=VARIATION_INSTRUCTIONS,
            model=self._settings.openai_model,
            tools=[],
            output_type=VaryMessageAgentResult,
        )

        prompt = (
            f"Trigger: {request.trigger_key}\n"
            f"Tone: {request.tone}\n"
            f"Template: {request.template}"
        )

        timeout_seconds = getattr(
            self._settings,
            "assistant_variation_timeout_seconds",
            5.0,
        )

        try:
            run_result = await asyncio.wait_for(
                Runner.run(agent, input=prompt, max_turns=1),
                timeout=timeout_seconds,
            )
        except asyncio.TimeoutError as exc:
            raise AppError("timeout", "Message variation timed out.", 504) from exc
        except Exception as exc:
            raise self._map_runner_error(exc) from exc

        final = run_result.final_output
        if not isinstance(final, VaryMessageAgentResult):
            raise AppError(
                "openai_unavailable",
                "Message variation returned an invalid response.",
                502,
            )

        if len(final.template) > 500:
            raise AppError("invalid_request", "Varied template is too long.", 422)

        if not validate_placeholder_preservation(request.template, final.template):
            raise AppError(
                "verification_failed",
                "Varied template did not preserve placeholders.",
                422,
            )

        _validate_template_syntax(final.template)
        if extract_placeholders(final.template) != extract_placeholders(request.template):
            raise AppError(
                "verification_failed",
                "Varied template did not preserve placeholders.",
                422,
            )

        return VaryMessageResponse(template=final.template)

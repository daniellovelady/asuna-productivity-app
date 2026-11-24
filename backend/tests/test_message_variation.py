import pytest

from app.agents.message_variation import MessageVariationService
from app.errors import AppError
from app.models.assistant_message import (
    VaryMessageRequest,
    extract_placeholders,
    validate_placeholder_preservation,
)


def test_extract_placeholders() -> None:
    assert extract_placeholders("You've been on {app} for {minutes} minutes.") == {
        "{app}",
        "{minutes}",
    }


def test_validate_placeholder_preservation() -> None:
    original = "You've been on {app} for {minutes} minutes."
    varied = "Looks like {app} has held you for {minutes} minutes."
    assert validate_placeholder_preservation(original, varied) is True
    assert validate_placeholder_preservation(original, "You've been on {app}.") is False


def test_variation_request_rejects_invalid_trigger() -> None:
    service = MessageVariationService()
    request = VaryMessageRequest(
        trigger_key="invalid",
        tone="neutral",
        template="Hello {app}.",
    )
    with pytest.raises(AppError) as exc:
        service.validate_request(request)
    assert exc.value.status_code == 422

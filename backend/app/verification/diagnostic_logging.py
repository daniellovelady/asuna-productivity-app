from __future__ import annotations

import logging

from app.diagnostics import diagnostics_enabled
from app.verification.diagnostic_failures import sanitize_verification_failures

verification_logger = logging.getLogger("asuna.coach.verification")
_logger_configured = False


def _ensure_verification_logger_configured() -> None:
    global _logger_configured
    if _logger_configured:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(levelname)s: %(name)s: %(message)s"),
    )
    verification_logger.addHandler(handler)
    verification_logger.setLevel(logging.WARNING)
    verification_logger.propagate = False
    _logger_configured = True


def log_verification_passed(request_id: str, attempt: int) -> None:
    if not diagnostics_enabled():
        return
    _ensure_verification_logger_configured()
    verification_logger.warning(
        "coach verification passed request_id=%s attempt=%s",
        request_id,
        attempt,
    )


def log_verification_failed(
    request_id: str,
    attempt: int,
    failures: list[str],
    *,
    evidence_paths: list[str] | None = None,
) -> None:
    if not diagnostics_enabled():
        return
    _ensure_verification_logger_configured()
    verification_logger.warning(
        "coach verification failed request_id=%s attempt=%s evidence_paths=%s failures=%s",
        request_id,
        attempt,
        evidence_paths or [],
        sanitize_verification_failures(failures),
    )

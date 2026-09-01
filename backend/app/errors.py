from typing import Literal

from pydantic import BaseModel

CoachErrorCode = Literal[
    "invalid_request",
    "unauthorized",
    "tool_failure",
    "openai_unavailable",
    "rate_limited",
    "timeout",
    "verification_failed",
    "configuration_error",
]


class CoachError(BaseModel):
    code: CoachErrorCode
    message: str


class AppError(Exception):
    def __init__(self, code: CoachErrorCode, message: str, status_code: int) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class AnalyticsServiceError(Exception):
    """Analytics RPC or mapping failure."""


class TaskServiceError(Exception):
    """Task query or mapping failure."""


class AuthenticationError(AppError):
    def __init__(self, message: str = "Authentication failed.") -> None:
        super().__init__("unauthorized", message, 401)


class VerificationFailedError(AppError):
    def __init__(self, message: str = "Coach response could not be verified.") -> None:
        super().__init__("verification_failed", message, 422)

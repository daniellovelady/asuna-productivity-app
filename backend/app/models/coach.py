from typing import Literal

from pydantic import BaseModel, Field

from app.models.evidence import VerifiedCoachResult
from app.errors import CoachError


class CoachAnalyzeRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None


class CoachAnalyzeResponse(BaseModel):
    request_id: str
    verification_status: Literal["verified", "failed", "repair_exhausted"]
    tools_used: list[str]
    result: VerifiedCoachResult | None = None
    error: CoachError | None = None

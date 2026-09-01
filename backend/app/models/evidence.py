from typing import Literal

from pydantic import BaseModel, Field


class EvidenceClaim(BaseModel):
    source: Literal["analytics", "tasks"]
    path: str


class CoachAgentResult(BaseModel):
    answer: str
    recommendations: list[str] = Field(default_factory=list, max_length=5)
    evidence: list[EvidenceClaim] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class ResolvedEvidence(BaseModel):
    source: Literal["analytics", "tasks"]
    path: str
    value: str


class VerifiedCoachResult(BaseModel):
    answer: str
    recommendations: list[str]
    evidence: list[ResolvedEvidence]
    limitations: list[str]

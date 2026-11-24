from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.evidence import EvidenceClaim, ResolvedEvidence


class ReportPeriod(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: str
    end: str
    timezone: str


class InsightItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=500)
    evidence: list[EvidenceClaim] = Field(min_length=1, max_length=5)


class WeeklyInsightAgentResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: InsightItem
    strengths: list[InsightItem] = Field(default_factory=list, max_length=5)
    observations: list[InsightItem] = Field(default_factory=list, max_length=5)
    recommendations: list[InsightItem] = Field(default_factory=list, max_length=5)
    limitations: list[str] = Field(default_factory=list, max_length=8)


class ResolvedInsightItem(BaseModel):
    text: str
    evidence: list[ResolvedEvidence]


DataConfidence = Literal["low", "medium", "high"]


class WeeklyInsightReport(BaseModel):
    report_period: ReportPeriod
    summary: ResolvedInsightItem
    strengths: list[ResolvedInsightItem]
    observations: list[ResolvedInsightItem]
    recommendations: list[ResolvedInsightItem]
    data_confidence: DataConfidence
    limitations: list[str]
    generated_at: str


class WeeklyInsightReportResponse(BaseModel):
    request_id: str
    verification_status: Literal["verified", "failed", "repair_exhausted"]
    report: WeeklyInsightReport | None = None
    error: "CoachError | None" = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


from app.errors import CoachError  # noqa: E402

WeeklyInsightReportResponse.model_rebuild()

from typing import Literal

from pydantic import BaseModel, Field


class AnalyticsRange(BaseModel):
    start: str
    end: str
    timezone: str


class AnalyticsFocusByDay(BaseModel):
    date: str
    focusMinutes: int


class AnalyticsFocusByTask(BaseModel):
    taskLabel: str
    focusMinutes: int


class AnalyticsDistractingApp(BaseModel):
    applicationName: str
    estimatedMinutes: float


class AnalyticsSnapshot(BaseModel):
    range: AnalyticsRange
    focusTodayMinutes: int
    totalFocusMinutes: int
    completedSessions: int
    interruptionCount: int
    averageSessionMinutes: float | None
    breakCompliancePercent: float | None
    focusByDay: list[AnalyticsFocusByDay]
    focusByTask: list[AnalyticsFocusByTask]
    topDistractingApps: list[AnalyticsDistractingApp]

    def to_evidence_payload(self) -> dict:
        return self.model_dump()

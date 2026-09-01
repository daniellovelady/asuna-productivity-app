from typing import Literal

from pydantic import BaseModel, Field

TaskStatus = Literal["pending", "in_progress"]
TaskPriority = Literal["low", "medium", "high"]

PRIORITY_RANK: dict[TaskPriority, int] = {
    "high": 0,
    "medium": 1,
    "low": 2,
}


class ActiveTaskItem(BaseModel):
    id: str
    title: str
    status: TaskStatus
    priority: TaskPriority


class ActiveTasksSummary(BaseModel):
    active_count: int
    returned_count: int
    truncated: bool
    tasks: list[ActiveTaskItem]

    def to_evidence_payload(self) -> dict:
        return {
            "activeCount": self.active_count,
            "returnedCount": self.returned_count,
            "truncated": self.truncated,
            "items": [task.model_dump() for task in self.tasks],
        }

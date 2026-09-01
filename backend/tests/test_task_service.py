import pytest

from app.errors import TaskServiceError
from app.models.tasks import PRIORITY_RANK
from app.services.task_service import sort_active_tasks


def test_priority_ordering_is_explicit_not_alphabetical():
    rows = [
        {
            "id": "1",
            "title": "Low task",
            "status": "pending",
            "priority": "low",
            "created_at": "2026-08-29T09:00:00+00:00",
        },
        {
            "id": "2",
            "title": "High task",
            "status": "pending",
            "priority": "high",
            "created_at": "2026-08-27T09:00:00+00:00",
        },
        {
            "id": "3",
            "title": "Medium task",
            "status": "in_progress",
            "priority": "medium",
            "created_at": "2026-08-28T09:00:00+00:00",
        },
    ]
    sorted_rows = sort_active_tasks(rows)
    assert [row["priority"] for row in sorted_rows] == ["high", "medium", "low"]


def test_priority_rank_values():
    assert PRIORITY_RANK["high"] < PRIORITY_RANK["medium"] < PRIORITY_RANK["low"]


@pytest.mark.asyncio
async def test_truncation_fields():
    from app.models.tasks import ActiveTasksSummary

    summary = ActiveTasksSummary(
        active_count=30,
        returned_count=25,
        truncated=True,
        tasks=[],
    )
    payload = summary.to_evidence_payload()
    assert payload["activeCount"] == 30
    assert payload["returnedCount"] == 25
    assert payload["truncated"] is True


def test_invalid_priority_raises():
    with pytest.raises(TaskServiceError):
        sort_active_tasks(
            [
                {
                    "id": "1",
                    "title": "Bad",
                    "status": "pending",
                    "priority": "urgent",
                    "created_at": "2026-08-29T09:00:00+00:00",
                }
            ]
        )

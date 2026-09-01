from app.agents.context import ToolStateRegistry
from app.agents.tools import sanitized_tool_failure
from app.errors import AnalyticsServiceError, TaskServiceError


def test_sanitized_tool_failure_codes():
    assert sanitized_tool_failure(None, AnalyticsServiceError("x")) == "analytics_unavailable"
    assert sanitized_tool_failure(None, TaskServiceError("x")) == "tasks_unavailable"
    assert sanitized_tool_failure(None, RuntimeError("secret")) == "tool_unavailable"


def test_tool_state_records_failure_without_payload():
    registry = ToolStateRegistry()
    registry.record_failure("get_productivity_snapshot", "analytics_unavailable")
    assert registry.tool_failed("get_productivity_snapshot")
    assert registry.get_payload("analytics") is None


def test_tool_state_success_payload():
    registry = ToolStateRegistry()
    registry.record_success("get_productivity_snapshot", {"totalFocusMinutes": 0})
    assert registry.get_payload("analytics")["totalFocusMinutes"] == 0

from agents import RunConfig
from agents.tracing import gen_trace_id

WORKFLOW_NAME = "ASUNA Productivity Coach"


def create_trace_id() -> str:
    return gen_trace_id()


def build_run_config(trace_id: str, request_id: str) -> RunConfig:
    return RunConfig(
        workflow_name=WORKFLOW_NAME,
        trace_id=trace_id,
        trace_include_sensitive_data=False,
        trace_metadata={"request_id": request_id},
    )

# Agentic Coach & API Bridge Specification

## Goal

Create a separate Python + FastAPI backend for A.S.U.N.A. that hosts a
read only productivity coach agent using the OpenAI Agents SDK.

The coach may interpret deterministic productivity facts and provide
recommendations.

The coach must never become the source of truth for productivity metrics.

Architecture:

    Supabase
        ↓
    deterministic analytics RPC
        ↓
    read-only backend tools
        ↓
    OpenAI Agents SDK
        ↓
    verification
        ↓
    FastAPI response
        ↓
    Electron API bridge
        ↓
    A.S.U.N.A. UI

---

# Core Principle

Normal deterministic code calculates facts.

AI interprets facts.

The agent must never calculate authoritative values directly from raw
timestamps when A.S.U.N.A. already has deterministic analytics available.

Example:

Correct:

    AnalyticsSnapshot:
        totalFocusMinutes = 101

    Coach:
        "You focused for 1h 41m over the last seven days."

Incorrect:

    Give raw timestamps to the model and ask it to calculate focus time.

---

# Read-Only Milestone

The productivity coach is READ ONLY in this milestone.

It may:

- retrieve deterministic productivity analytics
- retrieve a limited summary of active tasks
- interpret those results
- identify patterns
- suggest priorities
- suggest behavioral changes
- explain limitations in available data

It may NOT:

- create tasks
- edit tasks
- complete tasks
- delete tasks
- start focus sessions
- stop focus sessions
- modify preferences
- modify tracking settings
- write insights to Supabase
- claim that any unsupported action was performed

There are no mutation tools in this milestone.

If the user asks the coach to perform a write action, it must accurately state
that the action is not available.

---

# Backend Separation

Create a standalone Python backend under:

    backend/

The Electron application and Python backend are separate processes.

The backend owns:

- OPENAI_API_KEY
- OpenAI Agents SDK execution
- productivity-coach instructions
- tool implementations
- verification
- tracing configuration
- backend API routes

The Electron client must never contain OPENAI_API_KEY.

The OpenAI API key must never be:

- placed in renderer code
- placed in preload
- committed to Git
- returned through FastAPI
- logged
- sent to Supabase
- exposed to the Electron client

---

# Backend Development Environment

Use a Python virtual environment under backend/.

Conceptually:

    backend/
        .venv/
        app/
        tests/
        requirements.txt or pyproject.toml
        .env.example

The real backend .env must be gitignored.

Do not commit the virtual environment.

Dependency choices must be explicitly justified before installation.

Expected categories include:

- FastAPI
- ASGI server
- OpenAI Agents SDK
- Pydantic/settings support
- HTTP client if required for Supabase

Prefer the smallest reasonable dependency set.

---

# Backend Environment Variables

Backend configuration should include conceptually:

    OPENAI_API_KEY=
    OPENAI_MODEL=
    SUPABASE_URL=
    SUPABASE_PUBLISHABLE_KEY=

The exact model name must be configuration driven.

Do not scatter model names throughout application code.

Do not use a Supabase service role key.

The backend must operate with the authenticated user's Supabase identity and
RLS.

---

# Authentication Boundary

The Electron application already authenticates users through Supabase.

Requests to the coach backend must include the current Supabase access token as:

    Authorization: Bearer <access-token>

The token must never be logged.

The backend must validate the authenticated session before running an agent.

Do not trust:

- renderer-provided user_id
- agent-provided user_id
- arbitrary user identifiers in request bodies

The authenticated identity must come from the Supabase session represented by
the bearer token.

If authentication is invalid or expired:

    return an authentication error

Do not run the agent.

---

# Supabase Access From Backend

The backend must retain RLS protection.

Use the authenticated user's Supabase JWT when calling Supabase.

The backend may use the publishable key as required for Supabase API access,
but never the service role key.

The user's bearer token must remain authoritative for row ownership.

The agent itself must never receive:

- Supabase access token
- refresh token
- publishable key
- authentication headers

Authentication belongs to backend context, not model context.

---

# Agent Run Context

Create a backend-only context object conceptually containing:

    authenticated user identity
    Supabase bearer token
    request ID
    tool/service dependencies

This context may be supplied to function tools by the Agents SDK.

The context must not be exposed as model visible tool parameters.

For example, a tool may conceptually be:

    get_productivity_snapshot()

NOT:

    get_productivity_snapshot(user_id)

The model must not choose which user's data to retrieve.

---

# Tool Set

Keep the tool set intentionally narrow.

Initial tools:

## get_productivity_snapshot

Returns the deterministic AnalyticsSnapshot produced by:

    public.get_analytics_snapshot()

This includes:

- range
- timezone
- focus today
- total focus
- completed sessions
- interruption count
- average session length
- break compliance
- focus by day
- focus by task
- top distracting applications

The tool must not recalculate these values with AI.

---

## get_active_tasks_summary

Returns read-only active task information for the authenticated user.

Allowed fields should remain limited to information useful to coaching, such as:

- task ID
- title
- priority
- status

Description may be included only if explicitly justified.

Do not expose:

- other users' tasks
- authentication metadata
- unrelated profile information

The tool is read-only.

---

# No Raw Activity Tool

Do NOT give the agent a tool that retrieves raw activity_samples.

The coach already receives aggregated distracting-application information from
AnalyticsSnapshot.

This avoids:

- unnecessary sensitive context
- large prompts
- accidental raw behavioral analysis
- making the LLM responsible for aggregation

The existing deterministic analytics layer remains authoritative.

---

# Function Tool Requirements

Tools must:

- be Python functions
- have explicit Pydantic-compatible input/output schemas
- perform deterministic retrieval
- fail explicitly
- never fabricate fallback data

A failed tool must return or raise a structured tool failure.

Do not replace failed retrieval with:

    0 focus minutes
    no tasks
    no distracting apps

because those are valid real values and would hide the failure.

---

# Productivity Coach Agent

Create one primary agent:

    ProductivityCoach

Its purpose is to:

- understand the user's question
- retrieve required deterministic data
- interpret it
- provide concise coaching
- distinguish fact from recommendation
- state limitations

The agent must be instructed that A.S.U.N.A. data is authoritative only when
returned through approved tools.

The agent must never claim:

    "I observed..."
    "I saw you..."
    "I tracked..."

unless a tool result actually contains the underlying fact.

Prefer wording such as:

    "Based on your A.S.U.N.A. data..."

---

# Tool-Use Requirement

For questions involving user productivity data, the coach must retrieve
authoritative tool data before making factual claims.

Examples:

User:

    "How productive was I this week?"

Required:

    get_productivity_snapshot()

User:

    "What should I work on?"

Likely required:

    get_productivity_snapshot()
    get_active_tasks_summary()

User:

    "What is the Pomodoro technique?"

No user data tool is required because this is general knowledge.

The agent must distinguish general advice from claims about the user's actual
data.

---

# Agent Output Contract

Use structured output rather than unconstrained free text.

Conceptually:

```python
class EvidenceReference(BaseModel):
    source: str
    metric: str
    value: str

class CoachResult(BaseModel):
    answer: str
    recommendations: list[str]
    evidence: list[EvidenceReference]
    limitations: list[str]

---

# Implementation Notes (2026-08-31)

Implemented as a standalone `backend/` FastAPI service with Electron IPC bridge and
Insights UI view switching.

## Reviewer Decision

**LEAVE DISABLED** — `ENABLE_REVIEWER_AGENT=false` by default. Opt-in evaluation via
`backend/scripts/reviewer_eval.py --live` (billable). Deterministic verifier is the
production gate; reviewer remains experimental.

## Key runtime requirements

- Python **3.11 or 3.12** (`requires-python = ">=3.11,<3.14"`). Python 3.14 is not supported.
- Backend env: `backend/.env` (see `backend/.env.example`)
- Electron env: `COACH_BACKEND_URL`, `COACH_REQUEST_TIMEOUT_MS` (see root `.env.example`)
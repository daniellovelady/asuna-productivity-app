# Analytics Without AI Specification

## Goal

Build a deterministic analytics layer for A.S.U.N.A. that calculates productivity facts from existing Supabase data and displays those facts in the dashboard.

No AI or LLM may calculate, infer, estimate, or modify these metrics.

The analytics layer should produce facts that a future AI system may interpret, but all numerical calculations must be completed by normal deterministic code and SQL first.

---

# Core Principle

A.S.U.N.A. follows this pipeline:

    persisted user data
        ↓
    deterministic SQL / application logic
        ↓
    AnalyticsSnapshot
        ↓
    dashboard
        ↓
    future AI interpretation

AI must never be responsible for arithmetic or metric calculation.

---

# Data Sources

Analytics may use existing data from:

- focus_sessions
- tasks
- activity_samples
- preferences
- profiles

Do not introduce a separate analytics database.

Existing Supabase RLS remains authoritative.

Analytics queries must only operate on the authenticated user's data.

Do not use a service-role key.

---

# Analytics Timezone

Calendar-day analytics must use the user's profile timezone.

Do not group UTC timestamps directly into days when calculating user facing daily statistics.

For example:

    2026-08-31 02:00 UTC

may belong to the previous calendar day in the user's timezone.

Daily grouping must consistently apply the user's stored timezone.

If no valid timezone is available, use a documented safe fallback.

---

# Default Analytics Window

The dashboard should initially display analytics for:

    the last 7 local calendar days, including today

Do not build complex date range controls in this milestone.

The architecture should allow another range to be passed later.

---

# Focus Duration

Actual focus duration is calculated from an ended focus session:

    ended_at - started_at - paused_seconds

Formula:

    actual_focus_seconds =
        max(
            0,
            ended_at - started_at - paused_seconds
        )

Do not use target_duration_minutes as actual focus duration.

Do not count sessions without ended_at as completed historical focus time.

Both completed and abandoned ended sessions may contribute their actual time to
total focus duration unless a metric explicitly states completed-only.

Display focus duration in human readable minutes/hours.

---

# Focus Time Today

Calculate actual focus duration for sessions whose relevant local calendar date
is today.

Use the user's timezone.

Display:

    Focus Today

Example:

    1h 35m

---

# Focus Time by Day

For each of the last 7 local calendar days:

- group ended focus sessions by local date
- sum actual focus duration

Return days even when there was no focus time.

Example:

    Monday       45 min
    Tuesday      90 min
    Wednesday     0 min

Days should be ordered oldest to newest for timeline presentation.

---

# Focus Time by Task

For the analytics window:

- calculate actual focus duration
- group by task/session historical task identity

Prefer the immutable focus session task title snapshot for historical display
when available.

Do not depend on the current tasks table title for historical labels.

Sessions without a task should be grouped as:

    No task

Order by total focus time descending.

Do not create a separate completed_tasks table.

---

# Completed Sessions

Completed sessions are:

    focus_sessions.status = 'completed'

Count completed sessions within the analytics window.

Abandoned sessions are not completed sessions.

Example:

    Completed Sessions
    7

---

# Interruption Count

Sum:

    focus_sessions.interruption_count

for ended sessions in the analytics window.

Do not infer interruptions from application switching.

If interruption_count is currently zero because no interruption event was
recorded, display the deterministic zero rather than inventing interruptions.

---

# Average Session Length

Average session length is:

    total actual focus seconds across ended sessions
        /
    number of ended sessions

Include both:

- completed
- abandoned

Do not include active/unended sessions.

If there are no eligible sessions, display:

    —

rather than dividing by zero or displaying misleading data.

---

# Break Compliance

A.S.U.N.A. currently does not persist explicit break-start/break-end events.

Therefore break compliance in this milestone is a deterministic proxy based on
the time between consecutive focus sessions.

An eligible break opportunity occurs when:

1. a completed focus session ends
2. another focus session starts afterward
3. the next session begins within 120 minutes

If no subsequent session exists, the completed session is excluded from break
compliance because the system cannot know whether another work block was
intended.

If the next session starts more than 120 minutes later, exclude the pair rather
than treating a long absence as a successful planned break.

For an eligible pair:

    break_gap =
        next_session.started_at - previous_session.ended_at

The break is compliant when:

    break_gap >= preferences.break_minutes

Break compliance percentage:

    compliant eligible breaks
        /
    total eligible breaks
        * 100

If there are no eligible break opportunities, display:

    —

The dashboard should make clear that this is based on gaps between consecutive
focus sessions and is not direct break event tracking.

Changing the current break_minutes preference may affect this MVP calculation.
Historical break target snapshots may be added later.

---

# Top Distracting Applications

Use activity_samples where:

    classification = 'distracting'

Do not rank distracting applications by raw row count because activity samples
are coalesced.

Estimate observed activity duration using the interval between consecutive
samples.

For each sample:

    sample_duration =
        next_sample.recorded_at - current_sample.recorded_at

Cap an individual inferred interval at approximately:

    60 seconds

to prevent system sleep, application shutdown, network gaps, or missing samples
from generating artificial hours of activity.

Do not count negative intervals.

An open-ended final sample should not create an unbounded duration.

Group estimated distracting duration by normalized application_name.

Examples:

    youtube
    league_of_legends
    x

Order descending by estimated distracting duration.

The UI should describe this metric as sampled/estimated activity time rather
than exact foreground application time.

Raw window titles must never be involved in analytics.

---

# Idle Activity

Idle time must not be classified as productive or distracting work time merely
because the previous application remained active.

When calculating application duration analytics, respect the existing idle
information and avoid intentionally counting clearly idle periods as active
distracting/productive time.

Do not attempt to infer what the user was doing while idle.

---

# Deterministic Analytics API

Create a stable analytics contract for the renderer.

Conceptually:

```ts
interface AnalyticsSnapshot {
  range: {
    start: string;
    end: string;
    timezone: string;
  };

  focusTodayMinutes: number;
  totalFocusMinutes: number;
  completedSessions: number;
  interruptionCount: number;
  averageSessionMinutes: number | null;
  breakCompliancePercent: number | null;

  focusByDay: Array<{
    date: string;
    focusMinutes: number;
  }>;

  focusByTask: Array<{
    taskLabel: string;
    focusMinutes: number;
  }>;

  topDistractingApps: Array<{
    applicationName: string;
    estimatedMinutes: number;
  }>;
}
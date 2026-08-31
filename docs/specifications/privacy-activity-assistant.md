# Privacy-First Activity & Assistant Triggers Specification

## Goal

Add opt-in, privacy-conscious desktop activity tracking and deterministic assistant
triggers to A.S.U.N.A.

A.S.U.N.A. should be able to:

- Detect whether the user is idle.
- Detect the currently active application.
- Inspect limited active-window metadata temporarily for classification.
- Normalize application/site activity into safe identities such as:
  - vscode
  - league_of_legends
  - spotify
  - youtube
  - stackoverflow
  - google_calendar
  - github
  - discord
- Classify activity as:
  - productive
  - neutral
  - distracting
- Allow activity tracking to be:
  - enabled
  - disabled
  - paused
  - resumed
- Track activity both during and outside focus sessions.
- Produce deterministic assistant states/messages for:
  - idle
  - encouragement
  - distraction warning
  - task reminder
  - break reminder
  - focus-session celebration
- Persist only approved, minimal activity information for later analytics.

AI is not used for any trigger in this milestone.

---

# Privacy Model

Activity tracking is OFF by default.

The user must explicitly enable tracking.

When tracking is enabled, A.S.U.N.A. may monitor desktop activity while the
application is running, even when there is no active focus session.

Tracking may be paused or disabled at any time.

Disabling or pausing tracking must stop new activity sampling immediately.

A.S.U.N.A. should collect only the minimum amount of information required to
classify activity and generate deterministic assistant behavior.

---

## Allowed Activity Context

A.S.U.N.A. may inspect the currently active application and limited active-window
metadata for the sole purpose of determining a normalized activity identity and
classification.

The operating-system activity adapter may temporarily inspect:

- application/process name
- active window title

The active window title is transient input only.

Raw window-title data must be discarded immediately after classification.

Raw window titles must never be:

- persisted to Supabase
- stored in React application state
- sent through preload IPC
- logged
- included in analytics
- included in assistant messages
- sent to AI
- retained in an activity-history buffer

Only a normalized activity identity may leave the OS activity adapter.

Example:

Raw OS information:

    application: Google Chrome
    title: YouTube - Google Chrome

Adapter output:

    activityIdentity: youtube

The raw title is then discarded.

---

## Allowed Persisted Activity Data

The system may persist only:

- user ID
- optional focus session ID
- timestamp
- normalized application/site identity
- idle time in seconds
- productive / neutral / distracting classification

Example:

    user_id: <authenticated user>
    session_id: null
    recorded_at: <timestamp>
    application_name: league_of_legends
    idle_seconds: 0
    classification: distracting

Or during a focus session:

    user_id: <authenticated user>
    session_id: <focus session id>
    recorded_at: <timestamp>
    application_name: vscode
    idle_seconds: 0
    classification: productive

---

## Prohibited Data

The system must never persist, expose, or log:

- keystrokes
- typed text
- mouse input contents
- screenshots
- clipboard contents
- document contents
- raw window titles
- complete browser URLs
- URL paths
- URL query parameters
- browser history
- file paths
- lists of open windows
- document names
- chat/message contents
- email contents
- form contents
- passwords
- authentication tokens

The activity system must not attempt to inspect the contents of documents,
web pages, chats, emails, files, or user input.

---

# Tracking Scope

Activity tracking is independent from the Focus Engine.

Tracking can operate in two contexts:

## General Activity Tracking

When:

- the user is authenticated
- tracking is enabled
- tracking is not paused
- A.S.U.N.A. is running

A.S.U.N.A. may sample:

- active application/site identity
- idle time
- classification

A focus session is not required.

This allows A.S.U.N.A. to detect prolonged patterns such as:

- playing League of Legends for a long period
- watching YouTube for a long period
- sustained productive coding
- prolonged general computer usage

---

## Focus-Session Activity Tracking

When activity tracking is enabled and a focus session is active, samples may
also be associated with the current focus session.

Focus-session tracking adds session context but does not change the tracking
privacy rules.

Pausing activity tracking must not pause the Focus Engine.

Pausing the Focus Engine must not automatically pause activity tracking.

Disabling activity tracking must not stop or corrupt a focus session.

---

# Tracking States

Tracking has three states:

- disabled
- running
- paused

## Disabled

No active-window or idle sampling occurs.

No new activity samples are created.

This is the default state.

## Running

Activity sampling occurs while A.S.U.N.A. is running.

Tracking may operate whether or not a focus session is active.

## Paused

The user remains opted into activity tracking, but no new activity samples are
created until tracking is resumed.

Existing buffered/persisted samples are not deleted merely because tracking is
paused.

---

# Tracking State Transitions

Supported transitions:

    disabled -> running
    running -> paused
    paused -> running
    running -> disabled
    paused -> disabled

Disabling tracking must stop new sampling immediately.

Pausing tracking must stop new sampling immediately.

Signing out must stop tracking.

Quitting A.S.U.N.A. must stop tracking.

Tracking must never silently enable itself.

---

# Tracking Ownership

The Electron main process owns operating-system activity sampling state.

React must not directly inspect operating-system activity.

The renderer may only:

- enable tracking
- disable tracking
- pause tracking
- resume tracking
- retrieve approved tracking state
- display approved normalized activity information
- display deterministic assistant states/messages

Use narrow preload APIs.

Do not expose:

- raw ipcRenderer
- Node APIs
- arbitrary IPC channel access
- the active-window dependency directly to React
- raw operating-system window metadata to React

---

# Idle Detection

Use Electron main-process APIs for system idle detection where possible.

Idle time should be measured in seconds.

Idle detection must not inspect keyboard or mouse input contents.

Initial idle threshold:

    60 seconds

The threshold may later become configurable.

When the user exceeds the idle threshold while tracking is running, the activity
state may become idle.

Returning to activity clears the idle state.

Idle periods must not count toward productive or distracting streak duration.

---

# Active Application Sampling

Sample only the currently active application/window.

Do not enumerate every open window.

Use a reasonable polling interval.

Initial target:

    15 seconds between samples

Avoid high-frequency sampling.

If the active-application implementation returns metadata beyond what is
required, the adapter must discard prohibited fields before returning data to
the rest of A.S.U.N.A.

---

# Active Application Adapter

The OS integration layer must reduce raw active-window metadata into a safe,
normalized representation.

Conceptually:

    OS provider
        |
        | raw application + temporary title
        v
    ActiveActivityAdapter
        |
        | normalized identity only
        v
    Activity Tracker

Example safe adapter result:

```ts
interface NormalizedActivity {
  identity: string;
}
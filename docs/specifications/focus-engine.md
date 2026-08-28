# Focus Engine Specification

## Goal

Implement the local focus session engine for A.S.U.N.A.

The Electron main process must own authoritative focus session state.
The React renderer is responsible only for displaying session state and
sending user actions through approved preload APIs.

## Session States

A session may be:

- running
- paused

If no session exists, the application is considered idle.

Only one focus session may be active at a time.

## Required Operations

### Session Options

### Session Options

- The default focus session duration is 25 minutes.
- While no focus session is active, the time displayed on the focus timer
  should be clickable.
- Clicking the displayed time should open a dropdown allowing the user to
  select the focus session duration.
- Available durations are 5 through 60 minutes inclusive, in 5-minute
  increments.
- Session duration may only be changed while no session is active.
- The duration selector must be disabled or unavailable while a session
  is running or paused.
- When a session starts, the selected duration becomes part of the
  authoritative session state owned by the Electron main process.
- The Electron main process must validate the requested duration.
- Invalid durations must not create a session.
- The renderer should display the remaining session time as a countdown.
- Paused time must not reduce the remaining focus time.
- When remaining time reaches zero, the session should complete and the
  timer must not become negative.

### Timer Calculation

The Electron main process is responsible for calculating elapsed focus time.

The React renderer is responsible for calculating and displaying remaining time:

remaining time = target duration - elapsed focus time

The renderer should display remaining time as a countdown.

Paused time must not count toward elapsed focus time.

Remaining time must never display a negative value.

### Start

Starting a session should:

- Create a new focus session.
- Record its start timestamp.
- Set its status to running.
- Reject attempts to start another session while one already exists.

### Pause

Pausing should:

- Be allowed only for a running session.
- Record when the pause began.
- Set the session status to paused.

Elapsed focus time must not increase while paused.

### Resume

Resuming should:

- Be allowed only for a paused session.
- Add the duration of the pause to accumulated paused time.
- Return the session to running.

### Stop

Stopping should:

- End the active session.
- Return the completed session information.
- Clear the active session from memory.

## Renderer Requirements

The React renderer must:

- Display the current timer.
- Display controls appropriate to the current state.
- Retrieve the current session when the renderer loads.
- Recover the correct display after a renderer reload.

React must not be the authoritative owner of focus-session state.

## IPC Requirements

Renderer to main communication must use narrow preload APIs.

Do not:

- Expose ipcRenderer directly.
- Enable Node.js integration in React.
- Disable context isolation.
- Pass arbitrary IPC channel names from the renderer.

## Out of Scope

Do not implement:

- Supabase persistence
- Authentication
- Cloud synchronization
- Activity tracking
- Break reminders
- AI
- Avatar behavior
- Historical session storage

Those are later milestones.

## Acceptance Criteria

The feature is complete when:

1. A session can start.
2. A running session can pause.
3. A paused session can resume.
4. A session can stop.
5. A second session cannot start while one is active.
6. Paused time is not counted as focus time.
7. Reloading the renderer does not reset or corrupt the active session.
8. The React UI accurately reflects main-process state.
9. The renderer does not receive unrestricted Electron or Node access.
10. Relevant tests, lint, type checks, and build checks are run and reported.
11. A user can select a session duration from 5 to 60 minutes in
    5-minute increments before starting a session.
12. The selected duration cannot be changed while a session is running
    or paused.
13. Reloading the renderer during a session restores the correct selected
    duration and remaining time.
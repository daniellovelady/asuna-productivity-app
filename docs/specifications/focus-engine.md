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
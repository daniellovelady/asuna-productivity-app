# RLS, Tasks & Cross-Device Sync Specification

## Goal

Add functional cloud-backed task management and completed focus-session
persistence to A.S.U.N.A.

Supabase is the authoritative cloud source for saved tasks and completed
focus-session history.

Users must only be able to access their own data.

---

## Task CRUD

Authenticated users must be able to:

- Create a task.
- View their tasks.
- Edit their own tasks.
- Mark their own tasks complete.
- Delete their own tasks.

Tasks must be stored in Supabase.

Each task must belong to the authenticated user through user_id.

The renderer must not allow task operations while authentication state is
unavailable.

---

## Task Loading

After an authenticated user enters the dashboard:

1. Load that user's tasks from Supabase.
2. Show a loading state while the request is running.
3. Show the returned tasks when successful.
4. Show a useful error state when loading fails.
5. Allow the user to retry a failed load.

Do not silently replace failed cloud data with empty data.

---

## Authorization / RLS

Row Level Security must prevent one authenticated user from reading or
modifying another user's data.

Task operations must rely on Supabase RLS as the security boundary.

Client-side filtering is not sufficient security.

Existing RLS policies from the initial schema should be reviewed and updated
only when necessary.

No service-role key may be used in the Electron application.

---

## Completed Focus Sessions

The existing Electron main-process Focus Engine remains authoritative while a
focus session is active.

Do not move active timer state into React or Supabase.

When a focus session is completed or stopped:

1. Receive the completed session information from the existing Focus Engine.
2. Save the completed session to the focus_sessions Supabase table.
3. Associate it with the authenticated user.
4. Associate it with the selected task when a task was selected.
5. Surface a useful error if the cloud save fails.

A failed cloud save must not silently appear successful.

---

## Synchronization

Tasks and completed focus-session history are cloud-backed.

Expected behavior:

1. User creates a task while signed in.
2. Task is stored in Supabase.
3. User signs out or closes A.S.U.N.A.
4. User signs in again to the same account.
5. The task is loaded from Supabase.

The same behavior should work from another authenticated application session.

Do not implement complex offline synchronization during this milestone.

---

## Conflict Behavior

Supabase is authoritative for saved task data.

Add or use an updated_at timestamp for mutable task records.

When an operation succeeds, update local React state using the confirmed
server result.

Do not silently overwrite known stale data.

If a conflicting/stale update is detected, surface a useful state and reload
the latest server value.

Complex automatic conflict merging is out of scope.

---

## Loading, Error and Retry States

Cloud operations must expose useful UI states.

At minimum support:

- Initial task loading.
- Task-load failure.
- Create failure.
- Update failure.
- Delete failure.
- Completed focus-session save failure.
- Retry for appropriate failed operations.

Network failures must not silently discard data.

---

## Privacy and Security

Never:

- Expose the service-role key.
- Disable RLS to make functionality work.
- Trust user_id values supplied blindly by UI state.
- Allow Account A to read or modify Account B's rows.
- Log authentication tokens.

---

## Out of Scope

Do not implement:

- Activity tracking.
- Distraction monitoring.
- AI insights.
- Avatar behavior.
- Complex offline queues.
- Real-time collaborative task editing.
- Full conflict merging.
- OAuth.
- Notifications.
- Break reminders.

---

## Acceptance Criteria

This milestone is complete when:

1. An authenticated user can create a task.
2. Tasks are actually stored in Supabase.
3. Tasks reload after restarting or signing back into A.S.U.N.A.
4. A task can be edited.
5. A task can be completed.
6. A task can be deleted.
7. Account A cannot read Account B's tasks.
8. Account A cannot modify Account B's tasks.
9. Completed focus sessions are stored in Supabase.
10. Completed focus sessions restore as cloud history.
11. Failed network operations produce visible error states.
12. Appropriate failed operations can be retried.
13. RLS remains enabled.
14. No service-role key exists in the Electron client.
15. Tests, lint, typecheck and packaging are run and results documented.
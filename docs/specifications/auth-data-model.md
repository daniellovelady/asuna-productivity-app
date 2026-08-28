# Authentication & Data Model Specification

## Goal

Add user authentication and the initial cloud data model for A.S.U.N.A.

A user should be able to:

- Create an account with an email and password.
- Sign in with an existing account.
- Sign out.
- Close and reopen A.S.U.N.A. without having to sign in again every time.
- Have application data associated with their own account.

Supabase will be used for authentication and cloud database storage.

This milestone establishes the authentication system and database structure.

It does not yet implement full task management, cross-device synchronization,
activity tracking, or AI functionality.

---

## Basic Architecture

A.S.U.N.A. will have two important types of state:

### Local State

Local state is temporary information currently being used by the application.

Examples:

- Whether a menu is open.
- What page the user is viewing.
- The current visual state of the interface.

### Cloud Data

Cloud data is information that should remain available after the application
closes and should eventually be available on another computer.

Examples:

- User profile.
- Tasks.
- Completed focus sessions.
- Productivity preferences.
- Activity history.
- Productivity insights.

Supabase will be the cloud source of truth for this data.

---

## Authentication

Use Supabase Auth for user authentication.

### Create Account

The user should be able to create an account using:

- Email
- Password

If account creation succeeds, the application should show an appropriate
success state.

If account creation fails, the application should show a useful error message.

### Sign In

The user should be able to sign in using:

- Email
- Password

If the credentials are correct, the user should enter the main A.S.U.N.A.
dashboard.

If the credentials are incorrect, the application should display an error
message.

### Sign Out

The user should be able to sign out.

After signing out, the main authenticated dashboard should no longer be
accessible until the user signs in again.

### Session Restoration

A.S.U.N.A. should restore the user's authenticated session after the
application is restarted.

Expected behavior:

1. User signs in.
2. User closes A.S.U.N.A.
3. User reopens A.S.U.N.A.
4. If the previous authentication session is still valid, the user should
   return to the authenticated application without manually signing in again.

---

## User Ownership

Every piece of user-created cloud data must belong to a specific authenticated
user.

User-owned records should include a `user_id`.

The `user_id` should identify the Supabase authenticated user who owns the
record.

A user must never be able to access another user's private A.S.U.N.A. data.

---

# Initial Data Model

The following tables establish the initial database structure.

Not every table needs full application functionality during this milestone.

---

## Profiles

Stores basic information about the user.

Suggested fields:

- `id`
- `display_name`
- `avatar_style`
- `timezone`
- `created_at`

The profile ID should correspond to the authenticated user's ID.

---

## Tasks

Stores tasks created by users.

Suggested fields:

- `id`
- `user_id`
- `title`
- `description`
- `status`
- `priority`
- `created_at`
- `completed_at`

Task management functionality will be implemented in a later milestone.

---

## Focus Sessions

Stores completed or saved focus sessions.

Suggested fields:

- `id`
- `user_id`
- `task_id`
- `target_duration_minutes`
- `started_at`
- `ended_at`
- `paused_seconds`
- `interruption_count`
- `status`

The existing local Focus Engine remains responsible for active timer behavior.

Cloud storage for completed focus sessions will be connected later.

---

## Activity Samples

Stores approved productivity activity information.

Suggested fields:

- `id`
- `user_id`
- `session_id`
- `recorded_at`
- `application_name`
- `idle_seconds`
- `classification`

Possible classifications may include:

- productive
- neutral
- distracting

Activity tracking itself is not implemented during this milestone.

---

## Preferences

Stores user productivity settings.

Suggested fields:

- `user_id`
- `focus_minutes`
- `break_minutes`
- `tracking_enabled`
- `distraction_threshold_minutes`
- `encouragement_level`
- `avatar_style`

These settings will be connected to the interface in later milestones.

---

## Insights

Stores generated productivity reports or recommendations.

Suggested fields:

- `id`
- `user_id`
- `period_start`
- `period_end`
- `summary`
- `payload`
- `generated_at`

AI insight generation is not implemented during this milestone.

---

# Database Relationships

The important relationships are:

- One authenticated user can have one profile.
- One authenticated user can have many tasks.
- One authenticated user can have many focus sessions.
- One task can have many focus sessions.
- One focus session can have many activity samples.
- One authenticated user can have preferences.
- One authenticated user can have many productivity insights.

Conceptually:

Authenticated User
    |
    +-- Profile
    |
    +-- Tasks
    |     |
    |     +-- Focus Sessions
    |             |
    |             +-- Activity Samples
    |
    +-- Preferences
    |
    +-- Insights

---

# Security Requirements

## Row Level Security

Enable Supabase Row Level Security on all user-data tables.

This milestone does not need to implement every final RLS policy, but tables
should not be left openly accessible.

The next milestone will implement and verify user-specific access policies.

## API Keys

The Electron client may use the Supabase client/publishable key intended for
client applications.

The Supabase service-role key must never be included in the Electron client.

Do not:

- Hard-code private secrets into source files.
- Commit `.env` files.
- Store service-role credentials in React.
- Log authentication tokens.

---

# Environment Variables

Supabase configuration should be loaded through environment variables.

Expected development values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Real values should be stored in a local `.env` file.

The `.env` file must not be committed to Git.

A safe `.env.example` may be committed later without real secret values.

---

# User Interface Requirements

For this milestone, create a simple authentication interface.

The interface should support:

- Email input
- Password input
- Sign In button
- Create Account button
- Sign Out button when authenticated
- Loading state
- Useful authentication error messages

The authentication UI does not need advanced styling.

The existing productivity dashboard should remain intact.

---

# SQL Learning Requirement

As part of this milestone, demonstrate that the database structure can support
productivity calculations.

Use test data to demonstrate a query that can calculate focus minutes grouped
by task and day.

This query is for learning and database verification.

The full analytics system will be implemented later.

---

# Out of Scope

Do not implement the following during this milestone:

- Full task CRUD
- Cross-device synchronization testing
- Activity monitoring
- Distraction detection
- AI productivity analysis
- Avatar behavior
- Break reminders
- Password reset
- OAuth login
- Google login
- GitHub login
- Production email configuration
- Complex offline synchronization
- Final RLS policies for every application feature

These belong to later milestones.

---

# Acceptance Criteria

This milestone is complete when:

1. A Supabase project exists.
2. The initial database tables exist.
3. User-data tables have Row Level Security enabled.
4. A user can create an account using email and password.
5. A user can sign in.
6. A user can sign out.
7. Authentication errors are displayed clearly.
8. Closing and reopening A.S.U.N.A. restores a valid signed-in session.
9. The Supabase service-role key is not present in the Electron client.
10. `.env` files are excluded from Git.
11. A test SQL query can calculate focus minutes grouped by task and day.
12. Lint, type checks, tests, and build checks are run and documented.

---

# Not Yet Decided

The following decisions can be made in later milestones:

- Whether user preferences should also be cached locally.
- How offline synchronization should work.
- How conflicts between multiple computers should be resolved.
- Whether activity samples should be stored permanently or automatically
  deleted after a certain period.
- Whether productivity insights should be stored permanently.
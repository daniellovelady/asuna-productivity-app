# Dashboard Shell Specification

## Goal

Create the initial visual shell for the A.S.U.N.A. productivity dashboard.

This milestone establishes layout and component structure only.
It does not implement application functionality.

## Required UI Regions

### Sidebar

Display navigation items:

- Dashboard
- Tasks
- History
- Insights
- Settings

Dashboard should appear selected.

Navigation behavior is out of scope.

### Current Task

Display a card containing mock task data.

Example:

- Title: Build dashboard shell
- Priority: High
- Status: In Progress

No task persistence is required.

### Focus Timer

Display:

- `25:00`
- `Start Focus Session`

The timer is visual only.

No countdown behavior should be implemented.

### Statistics

Display placeholder cards for:

- Focus Time
- Sessions
- Productive Time
- Breaks

Use static mock values.

### Assistant 

Display a placeholder assistant / avatar region where the assistant should appear as a compact floating element in the bottom-right corner of the application viewport.

Requirements:

- The assistant must not occupy a full-width dashboard section.
- It should remain anchored to the bottom-right corner while dashboard
  content scrolls.
- Dashboard content should scroll independently behind or beside it.
- Leave enough spacing from the window edges that the assistant does not
  feel cramped.
- The assistant must not cover important controls or information.
- For this milestone, use a static placeholder only.
- Do not implement assistant animation, speech bubbles, AI behavior, or a
  separate Electron window yet.

## Responsive Requirements

The interface must remain usable at:

- 1440 × 900
- 1024 × 700

Requirements:

- No horizontal overflow
- No overlapping components
- Statistic cards may wrap
- Main content should remain readable

## Technical Requirements

- Use React and React DOM.
- Use TypeScript.
- Follow AGENTS.md.
- Keep renderer code inside the approved renderer structure.
- Do not add application functionality.
- Do not install packages without explicit approval.
- Do not modify Electron security configuration.
- Do not modify unrelated files.

## Out of Scope

Do not implement:

- Authentication
- Database storage
- Supabase
- AI
- Timer functionality
- Activity tracking
- Cross-device synchronization
- Avatar animation
- Working navigation

## Acceptance Criteria

The feature is complete when:

1. All required dashboard areas are visible.
2. Components are separated logically.
3. The interface works at desktop and laptop window sizes.
4. No horizontal overflow occurs.
5. TypeScript checks pass, except for any documented pre-existing issue.
6. Lint passes.
7. Production build succeeds.
8. No unapproved package is installed.
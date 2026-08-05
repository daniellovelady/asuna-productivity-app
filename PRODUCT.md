# Productivity Assistant

## Product Overview

A.S.U.N.A. (A Spectacular Unparalleled Neural Assistant) is a cross-device desktop application functioning as a productivity assistant that helps users track tasks, complete focused work sessions, recognize distractions, take appropriate breaks, and understand their productivity patterns. It also has the capacity for research assistance such as internet browsing and executing tasks on user applications (e.g. read and write files).

The application includes an animated desktop assistant that provides encouragement, reminders, break notifications, and distraction warnings.

## Target User

The initial target user is myself, a senior computer student who is preparing to graduate and enter the workforce; however this application may prove useful for those who:

- Work primarily on a desktop or laptop
- Has difficulty maintaining focus
- Wants to understand how their time is being used
- Benefits from encouragement and timely reminders
- Uses more than one computer

## Problem

I have tried various applications to help keep track of past and ongoing tasks / events in my life. In addition to this,
having a way personalized, fun, and engaging way to increase productivity and form better habits is something that I have always
sought, yet was never able to find. I aim for asuna to be a solution to this by connecting tasks, focus sessions, desktop activity, research, scheduling, and productivity insights in one interface. 


## Core User Experience

A user should be able to:

1. Sign into the application.
2. Create or select a task.
3. Start a focus session.
4. Schedule events and browse the internet.
5. Receive break and distraction reminders.
6. Finish the session.
7. Review statistics and productivity insights.
8. Sign into another computer and access the same data.

## MVP Features

The first working version should include:

- Electron desktop application
- React and TypeScript interface
- User registration and authentication
- Cross-device task synchronization
- Start, pause, resume, and stop focus sessions
- Idle-time detection
- Basic active-application tracking
- Daily and weekly productivity statistics
- Structured AI-generated productivity insights
- Capacity to browse the internet
- Animated assistant with speech bubbles
- Customizable reminder preferences

## Privacy Requirements

The application must:

- Ask for consent before tracking desktop activity
- Allow tracking to be paused immediately
- Allow productivity history to be deleted
- Avoid collecting keystrokes (unless given permission)
- Avoid taking screenshots (unless given permission)
- Avoid reading document contents (unless given permission)
- Avoid storing sensitive window titles unnecessarily (unless given permission)
- Keep AI API keys out of the desktop client

## Initial Non-Goals

The first version will not include:

- Mobile applications
- Team or employer monitoring
- Keystroke logging
- Screen recording
- Full browser-history collection
- Calendar integration
- Voice conversations
- Complex multi-agent workflows
- Perfect offline synchronization
- A public avatar marketplace

## Success Criteria

The MVP is successful when a user can:

- Sign in on two computers
- Access synchronized tasks and focus-session history
- Complete a full focus session
- Receive deterministic break and distraction reminders
- View accurate productivity statistics
- Receive validated AI-generated recommendations
- Install and run the application on Windows
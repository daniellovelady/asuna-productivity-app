export type FocusStartIntent =
  | { kind: 'none' }
  | { kind: 'task'; taskId: string; titleSnapshot: string }
  | {
    kind: 'calendar_event';
    calendarId: string;
    externalEventId: string;
    titleSnapshot: string;
    calendarProvider: 'google';
    linkedTaskId: string | null;
    linkedTaskTitleSnapshot: string | null;
  };

export type FocusPersistenceContext = {
  contextType: 'none' | 'task' | 'calendar_event';
  contextTitleSnapshot: string | null;
  externalCalendarEventId: string | null;
  externalCalendarId: string | null;
  calendarProvider: 'google' | null;
  taskId: string | null;
  taskTitleSnapshot: string | null;
};

export function focusIntentToPersistenceContext(intent: FocusStartIntent): FocusPersistenceContext {
  if (intent.kind === 'task') {
    return {
      contextType: 'task',
      contextTitleSnapshot: intent.titleSnapshot,
      externalCalendarEventId: null,
      externalCalendarId: null,
      calendarProvider: null,
      taskId: intent.taskId,
      taskTitleSnapshot: intent.titleSnapshot,
    };
  }

  if (intent.kind === 'calendar_event') {
    const taskId = intent.linkedTaskId;
    const taskTitle = intent.linkedTaskTitleSnapshot;
    return {
      contextType: 'calendar_event',
      contextTitleSnapshot: intent.titleSnapshot,
      externalCalendarEventId: intent.externalEventId,
      externalCalendarId: intent.calendarId,
      calendarProvider: intent.calendarProvider,
      taskId,
      taskTitleSnapshot: taskId ? taskTitle : null,
    };
  }

  return {
    contextType: 'none',
    contextTitleSnapshot: null,
    externalCalendarEventId: null,
    externalCalendarId: null,
    calendarProvider: null,
    taskId: null,
    taskTitleSnapshot: null,
  };
}

export function isFocusStartIntent(value: unknown): value is FocusStartIntent {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (record.kind === 'none') {
    return true;
  }

  if (record.kind === 'task') {
    return typeof record.taskId === 'string'
      && typeof record.titleSnapshot === 'string';
  }

  if (record.kind === 'calendar_event') {
    return typeof record.calendarId === 'string'
      && typeof record.externalEventId === 'string'
      && typeof record.titleSnapshot === 'string'
      && record.calendarProvider === 'google'
      && (record.linkedTaskId === null || typeof record.linkedTaskId === 'string')
      && (record.linkedTaskTitleSnapshot === null
        || typeof record.linkedTaskTitleSnapshot === 'string');
  }

  return false;
}

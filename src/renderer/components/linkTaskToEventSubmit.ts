import type { CalendarEvent } from '../../shared/calendar/types';
import type { CreateTaskInput, Task } from '../types/task';
import {
  createCalendarEventTaskLink,
  deleteCalendarEventTaskLink,
} from '../services/calendarEventTaskLinkService';

export type LinkTaskToEventMode = 'create' | 'link';

export type LinkTaskToEventSubmitInput = {
  mode: LinkTaskToEventMode;
  event: Pick<CalendarEvent, 'calendarId' | 'externalEventId' | 'linkedTaskId' | 'title'>;
  selectedTaskId: string;
  newTaskTitle: string;
  createTask: (input: CreateTaskInput) => Promise<Task>;
};

export class LinkTaskToEventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkTaskToEventValidationError';
  }
}

export async function submitLinkTaskToEvent(input: LinkTaskToEventSubmitInput): Promise<string> {
  let taskId = input.selectedTaskId;

  if (input.mode === 'create') {
    const title = input.newTaskTitle.trim();
    if (!title) {
      throw new LinkTaskToEventValidationError('Enter a task title.');
    }
    const created = await input.createTask({ title });
    taskId = created.id;
  }

  if (!taskId) {
    throw new LinkTaskToEventValidationError('Select or create a task.');
  }

  if (input.event.linkedTaskId) {
    await deleteCalendarEventTaskLink(input.event.calendarId, input.event.externalEventId);
  }

  await createCalendarEventTaskLink({
    externalCalendarId: input.event.calendarId,
    externalEventId: input.event.externalEventId,
    taskId,
    eventTitleSnapshot: input.event.title,
  });

  return taskId;
}

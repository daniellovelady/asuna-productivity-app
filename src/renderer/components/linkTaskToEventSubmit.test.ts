import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LinkTaskToEventValidationError,
  submitLinkTaskToEvent,
} from './linkTaskToEventSubmit';

vi.mock('../services/calendarEventTaskLinkService', () => ({
  createCalendarEventTaskLink: vi.fn(async () => undefined),
  deleteCalendarEventTaskLink: vi.fn(async () => undefined),
}));

import {
  createCalendarEventTaskLink,
  deleteCalendarEventTaskLink,
} from '../services/calendarEventTaskLinkService';

const baseEvent = {
  calendarId: 'cal-1',
  externalEventId: 'evt-1',
  linkedTaskId: null as string | null,
  title: 'Standup',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('submitLinkTaskToEvent', () => {
  it('links an existing task using calendar and event ids', async () => {
    await submitLinkTaskToEvent({
      mode: 'link',
      event: baseEvent,
      selectedTaskId: 'task-9',
      newTaskTitle: '',
      createTask: vi.fn(),
    });

    expect(createCalendarEventTaskLink).toHaveBeenCalledWith({
      externalCalendarId: 'cal-1',
      externalEventId: 'evt-1',
      taskId: 'task-9',
      eventTitleSnapshot: 'Standup',
    });
    expect(deleteCalendarEventTaskLink).not.toHaveBeenCalled();
  });

  it('creates a task then links it', async () => {
    const createTask = vi.fn(async () => ({
      id: 'task-new',
      title: 'New task',
      description: null,
      status: 'pending' as const,
      priority: 'medium' as const,
      createdAt: '',
      completedAt: null,
      updatedAt: '',
    }));

    await submitLinkTaskToEvent({
      mode: 'create',
      event: baseEvent,
      selectedTaskId: '',
      newTaskTitle: 'New task',
      createTask,
    });

    expect(createTask).toHaveBeenCalledWith({ title: 'New task' });
    expect(createCalendarEventTaskLink).toHaveBeenCalledWith({
      externalCalendarId: 'cal-1',
      externalEventId: 'evt-1',
      taskId: 'task-new',
      eventTitleSnapshot: 'Standup',
    });
  });

  it('replaces an existing link before saving', async () => {
    await submitLinkTaskToEvent({
      mode: 'link',
      event: { ...baseEvent, linkedTaskId: 'old-task' },
      selectedTaskId: 'task-2',
      newTaskTitle: '',
      createTask: vi.fn(),
    });

    expect(deleteCalendarEventTaskLink).toHaveBeenCalledWith('cal-1', 'evt-1');
    expect(createCalendarEventTaskLink).toHaveBeenCalled();
  });

  it('throws when link mode has no selected task', async () => {
    await expect(submitLinkTaskToEvent({
      mode: 'link',
      event: baseEvent,
      selectedTaskId: '',
      newTaskTitle: '',
      createTask: vi.fn(),
    })).rejects.toThrow(LinkTaskToEventValidationError);
  });
});

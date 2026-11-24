/**
 * @vitest-environment happy-dom
 */
import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgendaView } from './AgendaView';
import { CalendarEventRow } from './CalendarEventRow';
import { LinkTaskToEventDialog } from './LinkTaskToEventDialog';
import type { CalendarEvent } from '../../shared/calendar/types';
import type { Task } from '../types/task';

const sampleEvent: CalendarEvent = {
  externalEventId: 'evt-abc',
  calendarId: 'cal-primary',
  calendarName: 'Work',
  title: 'Design review',
  startAt: '2026-10-06T15:00:00.000Z',
  endAt: '2026-10-06T16:00:00.000Z',
  allDay: false,
  location: null,
  status: 'confirmed',
  provider: 'google',
  lastSyncedAt: '2026-10-06T12:00:00.000Z',
  linkedTaskId: null,
  mirrorScheduleBlockId: null,
};

const sampleTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Write spec',
    description: null,
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-10-01T00:00:00.000Z',
    completedAt: null,
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
];

function setNativeFormValue(element: HTMLInputElement | HTMLSelectElement, value: string): void {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

vi.mock('../hooks/useAgenda', () => ({
  useAgenda: () => ({
    state: {
      account: {
        provider: 'google',
        status: 'connected',
        connectedAt: '2026-10-01T00:00:00.000Z',
        lastSyncedAt: '2026-10-06T12:00:00.000Z',
        syncError: null,
      },
      agenda: {
        account: {
          provider: 'google',
          status: 'connected',
          connectedAt: '2026-10-01T00:00:00.000Z',
          lastSyncedAt: '2026-10-06T12:00:00.000Z',
          syncError: null,
        },
        today: [sampleEvent],
        upcoming: [],
      },
      syncPhase: 'idle',
    },
    error: null,
    isLoading: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    refresh: vi.fn(),
    startFocusFromEvent: vi.fn(),
    reload: vi.fn(),
  }),
}));

vi.mock('../hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: sampleTasks,
    loadStatus: 'success',
    loadError: null,
    reloadTasks: vi.fn(),
  }),
}));

vi.mock('../services/taskService', () => ({
  taskService: {
    createTask: vi.fn(),
  },
}));

vi.mock('../services/calendarEventTaskLinkService', () => ({
  createCalendarEventTaskLink: vi.fn(async () => undefined),
  deleteCalendarEventTaskLink: vi.fn(async () => undefined),
}));

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

function renderUi(element: ReturnType<typeof createElement>): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(element);
}

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = null;
  container = null;
  document.body.innerHTML = '';
});

describe('agenda link task flow', () => {
  it('clicking Create/Link Task opens the modal dialog for that event', async () => {
    renderUi(createElement(AgendaView));

    const linkButton = document.querySelector('.agenda-event-row button:nth-of-type(2)') as HTMLButtonElement;
    expect(linkButton?.textContent).toContain('Create/Link Task');
    linkButton.click();

    const dialog = document.querySelector('[aria-label="Link task to event"]');
    expect(dialog).not.toBeNull();
    expect(document.querySelector('.agenda-link-dialog-backdrop')).not.toBeNull();
    expect(document.body.textContent).toContain('Design review');
  });

  it('Cancel closes the dialog', () => {
    function Harness(): JSX.Element {
      const [linkEvent, setLinkEvent] = useState<CalendarEvent | null>(null);
      return createElement(
        'div',
        null,
        createElement(CalendarEventRow, {
          event: sampleEvent,
          onStartFocus: () => undefined,
          onLinkTask: () => setLinkEvent(sampleEvent),
        }),
        linkEvent
          ? createElement(LinkTaskToEventDialog, {
            event: linkEvent,
            tasks: sampleTasks,
            tasksLoadStatus: 'success',
            tasksLoadError: null,
            onClose: () => setLinkEvent(null),
            onLinked: () => undefined,
            onRetryLoadTasks: () => undefined,
          })
          : null,
      );
    }

    renderUi(createElement(Harness));

    (document.querySelector('.agenda-event-row button:nth-of-type(2)') as HTMLButtonElement).click();
    expect(document.querySelector('[aria-label="Link task to event"]')).not.toBeNull();

    const cancel = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent === 'Cancel');
    cancel?.click();
    expect(document.querySelector('[aria-label="Link task to event"]')).toBeNull();
  });

  it('shows task load errors inside the dialog', () => {
    renderUi(createElement(LinkTaskToEventDialog, {
      event: sampleEvent,
      tasks: [],
      tasksLoadStatus: 'error',
      tasksLoadError: 'Tasks unavailable',
      onClose: () => undefined,
      onLinked: () => undefined,
      onRetryLoadTasks: () => undefined,
    }));

    expect(document.body.textContent).toContain('Tasks unavailable');
    expect(document.querySelector('.task-panel-error')).not.toBeNull();
  });

  it('link existing task path invokes the link service with event identity', async () => {
    const { createCalendarEventTaskLink } = await import('../services/calendarEventTaskLinkService');

    renderUi(createElement(LinkTaskToEventDialog, {
      event: sampleEvent,
      tasks: sampleTasks,
      tasksLoadStatus: 'success',
      tasksLoadError: null,
      onClose: vi.fn(),
      onLinked: vi.fn(),
      onRetryLoadTasks: vi.fn(),
    }));

    const select = document.querySelector('select.settings-select') as HTMLSelectElement;
    setNativeFormValue(select, 'task-1');

    const save = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent === 'Save link');
    save?.click();

    await vi.waitFor(() => {
      expect(createCalendarEventTaskLink).toHaveBeenCalledWith({
        externalCalendarId: 'cal-primary',
        externalEventId: 'evt-abc',
        taskId: 'task-1',
        eventTitleSnapshot: 'Design review',
      });
    });
  });
});

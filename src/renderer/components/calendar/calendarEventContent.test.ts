/**
 * @vitest-environment happy-dom
 */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { EventContentArg } from '@fullcalendar/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GoogleEventItem } from '../../../shared/calendar/unifiedCalendarItem';
import {
  CalendarEventContentBody,
  createCalendarEventContentRenderer,
} from './CalendarEventContent';
import { UnifiedCalendarItemsProvider } from './UnifiedCalendarItemsContext';

function buildEventContentArg(unifiedItemId: string): EventContentArg {
  return {
    event: {
      title: 'Standup',
      extendedProps: { unifiedItemId },
    },
  } as unknown as EventContentArg;
}

const googleItem: GoogleEventItem = {
  id: 'google:cal:evt',
  source: 'google_calendar',
  title: 'Standup',
  start: '2026-01-15T15:00:00.000Z',
  end: '2026-01-15T16:00:00.000Z',
  allDay: false,
  capabilities: { canEdit: false, canDrag: false, canResize: false },
  calendarId: 'cal',
  externalEventId: 'evt',
  calendarName: 'Work',
  location: null,
  linkedTaskId: null,
  mirrorScheduleBlockId: null,
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('CalendarEventContent', () => {
  it('uses a callback that returns JSX instead of a hook-bearing component reference', () => {
    const renderer = createCalendarEventContentRenderer();
    const element = renderer(buildEventContentArg(googleItem.id));
    expect(element.type).toBe(CalendarEventContentBody);
    expect(renderer).not.toBe(CalendarEventContentBody);
  });

  it('renders badge text when mounted through the FullCalendar-style callback', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const itemsById = new Map([[googleItem.id, googleItem]]);
    const renderer = createCalendarEventContentRenderer();

    act(() => {
      root.render(
        createElement(
          UnifiedCalendarItemsProvider,
          { itemsById },
          renderer(buildEventContentArg(googleItem.id)),
        ),
      );
    });

    expect(host.textContent).toContain('Google');
    expect(host.textContent).toContain('Standup');
  });
});
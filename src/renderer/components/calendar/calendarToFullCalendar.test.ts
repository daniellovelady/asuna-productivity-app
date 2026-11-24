import { describe, expect, it } from 'vitest';
import type { GoogleEventItem } from '../../../shared/calendar/unifiedCalendarItem';
import {
  productionCalendarInteractionDisabled,
  unifiedItemToFullCalendarEvent,
} from './calendarToFullCalendar';

describe('productionCalendarInteractionDisabled', () => {
  it('disables drag, resize, and drop', () => {
    expect(productionCalendarInteractionDisabled()).toEqual({
      editable: false,
      eventStartEditable: false,
      eventDurationEditable: false,
      droppable: false,
      selectable: false,
    });
  });
});

describe('unifiedItemToFullCalendarEvent', () => {
  it('stores only unifiedItemId in extendedProps', () => {
    const item: GoogleEventItem = {
      id: 'google:cal:evt',
      source: 'google_calendar',
      title: 'Team sync',
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

    const fc = unifiedItemToFullCalendarEvent(item);
    expect(fc.extendedProps).toEqual({ unifiedItemId: 'google:cal:evt' });
    expect(fc).not.toHaveProperty('extendedProps.unifiedItem');
  });

  it('passes UTC instants through for timed events', () => {
    const item: GoogleEventItem = {
      id: 'google:cal:evt2',
      source: 'google_calendar',
      title: 'Class',
      start: '2026-11-23T19:25:00.000Z',
      end: '2026-11-23T20:40:00.000Z',
      allDay: false,
      capabilities: { canEdit: false, canDrag: false, canResize: false },
      calendarId: 'cal',
      externalEventId: 'evt2',
      calendarName: 'Work',
      location: null,
      linkedTaskId: null,
      mirrorScheduleBlockId: null,
    };

    const fc = unifiedItemToFullCalendarEvent(item);
    expect(fc.start).toBe('2026-11-23T19:25:00.000Z');
    expect(fc.end).toBe('2026-11-23T20:40:00.000Z');
    expect(fc.allDay).toBe(false);
  });
});
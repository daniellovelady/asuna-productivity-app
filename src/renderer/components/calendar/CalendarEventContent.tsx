import { useCallback, type ComponentType } from 'react';
import type { EventContentArg } from '@fullcalendar/react';
import { useUnifiedCalendarItem } from './UnifiedCalendarItemsContext';

/**
 * React function component — safe for hooks. Must be rendered via JSX from a
 * FullCalendar eventContent callback, not passed directly as eventContent.
 */
export function CalendarEventContentBody(arg: EventContentArg): JSX.Element {
  const unifiedItemId = arg.event.extendedProps.unifiedItemId as string | undefined;
  const item = useUnifiedCalendarItem(unifiedItemId);
  const sourceLabel = item?.source === 'asuna_schedule_block' ? 'ASUNA' : 'Google';

  return (
    <div className="calendar-fc-event__inner">
      <span className="calendar-fc-event__badge">{sourceLabel}</span>
      <span className="calendar-fc-event__title">{arg.event.title}</span>
    </div>
  );
}

export function createCalendarEventContentRenderer(): (
  arg: EventContentArg,
) => JSX.Element {
  const Body = CalendarEventContentBody as ComponentType<EventContentArg>;
  return (arg: EventContentArg) => <Body {...arg} />;
}

export function useCalendarEventContentRenderer(): (arg: EventContentArg) => JSX.Element {
  return useCallback((arg: EventContentArg) => <CalendarEventContentBody {...arg} />, []);
}
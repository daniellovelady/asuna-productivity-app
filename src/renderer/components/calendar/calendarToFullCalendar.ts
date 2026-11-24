import type { UnifiedCalendarItem } from '../../../shared/calendar/unifiedCalendarItem';

const ASUNA_CLASS = 'calendar-fc-event--asuna';
const GOOGLE_CLASS = 'calendar-fc-event--google';

export function unifiedItemToFullCalendarEvent(item: UnifiedCalendarItem): Record<string, unknown> {
  const className = item.source === 'asuna_schedule_block' ? ASUNA_CLASS : GOOGLE_CLASS;
  const core = {
    id: item.id,
    title: item.title,
    start: item.start,
    end: item.end,
    editable: false,
    startEditable: false,
    durationEditable: false,
    classNames: [className],
    extendedProps: { unifiedItemId: item.id },
  };

  if (item.allDay) {
    return { ...core, allDay: true };
  }

  return { ...core, allDay: false };
}

export function productionCalendarInteractionDisabled(): {
  editable: boolean;
  eventStartEditable: boolean;
  eventDurationEditable: boolean;
  droppable: boolean;
  selectable: boolean;
} {
  return {
    editable: false,
    eventStartEditable: false,
    eventDurationEditable: false,
    droppable: false,
    selectable: false,
  };
}
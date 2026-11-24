import type { CalendarEvent } from '../../shared/calendar/types';

type CalendarEventRowProps = {
  event: CalendarEvent;
  onStartFocus: () => void;
  onLinkTask: () => void;
  disabled?: boolean;
};

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day';
  }

  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const timeFormat: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };

  return `${start.toLocaleTimeString([], timeFormat)} – ${end.toLocaleTimeString([], timeFormat)}`;
}

export function CalendarEventRow({
  event,
  onStartFocus,
  onLinkTask,
  disabled = false,
}: CalendarEventRowProps): JSX.Element {
  return (
    <article className="agenda-event-row">
      <div className="agenda-event-time">{formatEventTime(event)}</div>
      <h3 className="agenda-event-title">{event.title}</h3>
      {event.calendarName && !event.calendarName.toLowerCase().includes('primary') ? (
        <p className="agenda-event-calendar">{event.calendarName}</p>
      ) : null}
      {event.location ? (
        <p className="agenda-event-location">{event.location}</p>
      ) : null}
      {event.linkedTaskId ? (
        <p className="agenda-event-linked">Linked to a task</p>
      ) : null}
      <div className="agenda-event-actions">
        <button type="button" onClick={onStartFocus} disabled={disabled}>
          Start Focus
        </button>
        <button type="button" onClick={onLinkTask} disabled={disabled}>
          {event.linkedTaskId ? 'Change Link' : 'Create/Link Task'}
        </button>
      </div>
    </article>
  );
}

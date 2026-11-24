import type { UnifiedCalendarItem } from '../../../shared/calendar/unifiedCalendarItem';

type CalendarEventDetailDialogProps = {
  item: UnifiedCalendarItem | null;
  onClose: () => void;
  onStartFocusGoogle?: () => void;
  onLinkTaskGoogle?: () => void;
  googleActionsDisabled?: boolean;
};

function formatWhen(item: UnifiedCalendarItem): string {
  const start = new Date(item.start);
  const end = new Date(item.end);
  if (item.allDay) {
    return `${start.toLocaleDateString()} (all day)`;
  }
  return `${start.toLocaleString()} – ${end.toLocaleString()}`;
}

export function CalendarEventDetailDialog({
  item,
  onClose,
  onStartFocusGoogle,
  onLinkTaskGoogle,
  googleActionsDisabled,
}: CalendarEventDetailDialogProps): JSX.Element | null {
  if (!item) {
    return null;
  }

  return (
    <div className="agenda-link-dialog-backdrop" role="presentation" onClick={onClose}>
      <dialog
        className="agenda-link-dialog calendar-event-detail"
        open
        aria-labelledby="calendar-event-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="calendar-event-detail-title">{item.title}</h3>
        <p>{formatWhen(item)}</p>
        <p>
          Source:{' '}
          {item.source === 'asuna_schedule_block' ? 'A.S.U.N.A. ScheduleBlock' : 'Google Calendar'}
        </p>
        {item.source === 'google_calendar' ? (
          <>
            <p>Calendar: {item.calendarName}</p>
            {item.location ? <p>Location: {item.location}</p> : null}
            {item.linkedTaskId ? <p>Linked to an A.S.U.N.A. task</p> : null}
            <div className="agenda-link-actions">
              <button type="button" onClick={onStartFocusGoogle} disabled={googleActionsDisabled}>
                Start Focus
              </button>
              <button type="button" onClick={onLinkTaskGoogle} disabled={googleActionsDisabled}>
                {item.linkedTaskId ? 'Change Link' : 'Create/Link Task'}
              </button>
            </div>
          </>
        ) : null}
        <div className="agenda-link-actions">
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </dialog>
    </div>
  );
}
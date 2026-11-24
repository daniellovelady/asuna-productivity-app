import type { CalendarListEntry } from '../../../shared/calendar/types';
import type { SourceVisibilityState } from '../../../shared/calendar/unifiedCalendarItem';

type CalendarSourceVisibilityProps = {
  visibility: SourceVisibilityState;
  calendarList: CalendarListEntry[];
  onChange: (next: SourceVisibilityState) => void;
};

export function CalendarSourceVisibility({
  visibility,
  calendarList,
  onChange,
}: CalendarSourceVisibilityProps): JSX.Element {
  const toggleCalendar = (calendarId: string, checked: boolean) => {
    const hidden = new Set(visibility.hiddenGoogleCalendarIds);
    if (checked) {
      hidden.delete(calendarId);
    } else {
      hidden.add(calendarId);
    }
    onChange({ ...visibility, hiddenGoogleCalendarIds: hidden });
  };

  return (
    <section className="calendar-source-visibility" aria-label="Calendar sources">
      <h3 className="calendar-side-heading">Sources</h3>
      <label className="calendar-source-toggle">
        <input
          type="checkbox"
          checked={visibility.showAsunaBlocks}
          onChange={(event) => {
            onChange({ ...visibility, showAsunaBlocks: event.target.checked });
          }}
        />
        A.S.U.N.A. ScheduleBlocks
      </label>
      <label className="calendar-source-toggle">
        <input
          type="checkbox"
          checked={visibility.showGoogleCalendars}
          onChange={(event) => {
            onChange({ ...visibility, showGoogleCalendars: event.target.checked });
          }}
        />
        Google Calendar
      </label>
      {visibility.showGoogleCalendars && calendarList.length > 0 ? (
        <ul className="calendar-source-list">
          {calendarList.map((calendar) => {
            const checked = !visibility.hiddenGoogleCalendarIds.has(calendar.id);
            return (
              <li key={calendar.id}>
                <label className="calendar-source-toggle">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => toggleCalendar(calendar.id, event.target.checked)}
                  />
                  {calendar.name}
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
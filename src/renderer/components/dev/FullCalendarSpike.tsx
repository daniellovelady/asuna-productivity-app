import { useCallback, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { CalendarRef } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import multiMonthPlugin from '@fullcalendar/react/multimonth';
import interactionPlugin from '@fullcalendar/react/interaction';
import '@fullcalendar/react/skeleton.css';
import {
  isSpikeView,
  spikeToolbarChangeView,
  spikeToolbarNext,
  spikeToolbarPrevious,
  spikeToolbarToday,
  type SpikeView,
} from './fullCalendarSpikeToolbar';

type SpikeEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps?: { customBadge?: boolean };
};

function buildStaticSpikeEvents(): SpikeEvent[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const day = `${y}-${m}-${d}`;

  return [
    {
      id: 'spike-project-work',
      title: 'Project Work',
      start: `${day}T10:00:00`,
      end: `${day}T11:30:00`,
      extendedProps: { customBadge: true },
    },
    {
      id: 'spike-networking-lab',
      title: 'Networking Lab',
      start: `${day}T13:00:00`,
      end: `${day}T14:00:00`,
    },
    {
      id: 'spike-study-session',
      title: 'Study Session',
      start: `${day}T16:00:00`,
      end: `${day}T17:00:00`,
    },
  ];
}

const SPIKE_VIEWS: Array<{ id: SpikeView; label: string }> = [
  { id: 'dayGridMonth', label: 'Month' },
  { id: 'timeGridWeek', label: 'Week' },
  { id: 'timeGridDay', label: 'Day' },
  { id: 'multiMonthYear', label: 'Year' },
];

export function FullCalendarSpike(): JSX.Element {
  const calendarRef = useRef<CalendarRef>(null);
  const [activeView, setActiveView] = useState<SpikeView>('dayGridMonth');
  const [viewTitle, setViewTitle] = useState('');
  const [events, setEvents] = useState<SpikeEvent[]>(() => buildStaticSpikeEvents());
  const [interactionLog, setInteractionLog] = useState<string[]>([]);

  const plugins = useMemo(
    () => [dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin],
    [],
  );

  const getApi = useCallback(() => calendarRef.current?.getApi(), []);

  const pushLog = useCallback((message: string) => {
    const line = `[fc-spike] ${message}`;
    if (import.meta.env.DEV) {
      console.info(line);
    }
    setInteractionLog((prev) => [line, ...prev].slice(0, 8));
  }, []);

  const handlePrevious = useCallback(() => {
    const api = getApi();
    if (!api) {
      return;
    }
    spikeToolbarPrevious(api);
    pushLog('prev');
  }, [getApi, pushLog]);

  const handleNext = useCallback(() => {
    const api = getApi();
    if (!api) {
      return;
    }
    spikeToolbarNext(api);
    pushLog('next');
  }, [getApi, pushLog]);

  const handleToday = useCallback(() => {
    const api = getApi();
    if (!api) {
      return;
    }
    spikeToolbarToday(api);
    pushLog('today:dayGridMonth');
  }, [getApi, pushLog]);

  const handleChangeView = useCallback(
    (view: SpikeView) => {
      const api = getApi();
      if (!api) {
        return;
      }
      spikeToolbarChangeView(api, view);
      pushLog(`changeView:${view}`);
    },
    [getApi, pushLog],
  );

  return (
    <div className="fc-spike-dev" data-testid="fullcalendar-spike">
      <header className="fc-spike-header">
        <h1>FullCalendar Phase 0A spike (dev only)</h1>
        <p className="fc-spike-hint">
          Set VITE_FULLCALENDAR_SPIKE=1 in .env and restart npm start. Production Agenda unchanged.
        </p>
      </header>

      <div className="fc-spike-toolbar" role="toolbar" aria-label="Calendar spike controls">
        <button type="button" onClick={handlePrevious}>
          Previous
        </button>
        <button type="button" onClick={handleToday}>
          Today
        </button>
        <button type="button" onClick={handleNext}>
          Next
        </button>
        {viewTitle ? (
          <span className="fc-spike-view-title" data-testid="fc-spike-view-title">
            {viewTitle}
          </span>
        ) : null}
        <span className="fc-spike-toolbar-sep" aria-hidden="true" />
        {SPIKE_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={activeView === view.id ? 'fc-spike-view-active' : undefined}
            onClick={() => handleChangeView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="fc-spike-calendar-host">
        <FullCalendar
          ref={calendarRef}
          plugins={plugins}
          initialView="dayGridMonth"
          headerToolbar={false}
          height="auto"
          editable
          selectable
          events={events}
          eventContent={(arg) => {
            const showBadge = Boolean(arg.event.extendedProps.customBadge);
            return (
              <div className="fc-spike-event-content">
                {showBadge ? (
                  <span className="fc-spike-event-badge" aria-hidden="true">
                    ◆
                  </span>
                ) : null}
                <span className="fc-spike-event-title">{arg.event.title}</span>
              </div>
            );
          }}
          eventDrop={(info) => {
            setEvents((prev) =>
              prev.map((event) =>
                event.id === info.event.id
                  ? {
                      ...event,
                      start: info.event.start?.toISOString() ?? event.start,
                      end: info.event.end?.toISOString() ?? event.end,
                    }
                  : event,
              ),
            );
            pushLog(`eventDrop:${info.event.id}`);
          }}
          eventResize={(info) => {
            setEvents((prev) =>
              prev.map((event) =>
                event.id === info.event.id
                  ? {
                      ...event,
                      start: info.event.start?.toISOString() ?? event.start,
                      end: info.event.end?.toISOString() ?? event.end,
                    }
                  : event,
              ),
            );
            pushLog(`eventResize:${info.event.id}`);
          }}
          select={(info) => {
            pushLog(`select:${info.startStr}..${info.endStr}`);
          }}
          datesSet={(info) => {
            if (isSpikeView(info.view.type)) {
              setActiveView(info.view.type);
            }
            setViewTitle(info.view.title);
          }}
        />
      </div>

      <aside className="fc-spike-log" aria-label="Interaction log">
        <h2>Interaction log</h2>
        <ul>
          {interactionLog.length === 0 ? (
            <li>Drag, resize, or select on the calendar.</li>
          ) : (
            interactionLog.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))
          )}
        </ul>
      </aside>
    </div>
  );
}
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import FullCalendar from '@fullcalendar/react';
import type { CalendarRef, DatesSetArg, EventClickArg, EventSourceInput } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import multiMonthPlugin from '@fullcalendar/react/multimonth';
import interactionPlugin from '@fullcalendar/react/interaction';
import '@fullcalendar/react/skeleton.css';
import type { UnifiedCalendarItem } from '../../../shared/calendar/unifiedCalendarItem';
import type { MonthSelectCommand } from './calendarNavigatorLogic';
import {
  calendarToolbarChangeView,
  calendarToolbarNext,
  calendarToolbarPrevious,
  calendarToolbarToday,
  isCalendarWorkspaceView,
  type CalendarWorkspaceApi,
  type CalendarWorkspaceView,
} from './calendarWorkspaceToolbar';
import { calendarToolbarChangeViewFromYear } from './yearViewNavigation';
import { viewInstantToPlainDateIso } from './calendarPlainDate';
import {
  productionCalendarInteractionDisabled,
  unifiedItemToFullCalendarEvent,
} from './calendarToFullCalendar';
import { useCalendarEventContentRenderer } from './CalendarEventContent';
import { CalendarMascotLayer } from './CalendarMascotLayer';
import { CalendarToolbar } from './CalendarToolbar';
import { UnifiedCalendarItemsProvider } from './UnifiedCalendarItemsContext';
import {
  formatDatesSetRange,
  logCalendarMemoryCounters,
} from '../../diagnostics/calendarMemoryDiag';
import { logCalendarLifecycle } from '../../diagnostics/calendarLifecycleDiag';
import { tryEmitCalendarTimingDiagnostic } from '../../diagnostics/calendarTimedEventDiag';

export type CalendarGridHostHandle = {
  gotoDate: (date: string) => void;
  applyMonthSelection: (command: MonthSelectCommand) => void;
};

type CalendarGridHostProps = {
  timeZone: string;
  timeZoneReady: boolean;
  unifiedItems: UnifiedCalendarItem[];
  scheduleBlockCount: number;
  googleEventCount: number;
  onRangeChange: (rangeStart: string, rangeEnd: string) => void;
  onFocusDateChange: (dateIso: string) => void;
  onEventSelected: (item: UnifiedCalendarItem) => void;
  onViewChange?: (view: CalendarWorkspaceView) => void;
};

const FC_PLUGINS = [dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin] as const;

export const CalendarGridHost = forwardRef<CalendarGridHostHandle, CalendarGridHostProps>(
  function CalendarGridHost(
    {
      timeZone,
      timeZoneReady,
      unifiedItems,
      scheduleBlockCount,
      googleEventCount,
      onRangeChange,
      onFocusDateChange,
      onEventSelected,
      onViewChange,
    },
    imperativeRef,
  ): JSX.Element {
    const calendarRef = useRef<CalendarRef>(null);
    const unifiedItemsRef = useRef(unifiedItems);
    unifiedItemsRef.current = unifiedItems;
    const lastDatesSetRef = useRef<DatesSetArg | null>(null);
    const timingDiagLatchRef = useRef<string | null>(null);
    const activeViewRef = useRef<CalendarWorkspaceView>('dayGridMonth');

    const [activeView, setActiveView] = useState<CalendarWorkspaceView>('dayGridMonth');
    activeViewRef.current = activeView;
    const [viewTitle, setViewTitle] = useState('');

    const itemsById = useMemo(() => {
      const map = new Map<string, UnifiedCalendarItem>();
      for (const item of unifiedItems) {
        map.set(item.id, item);
      }
      return map;
    }, [unifiedItems]);

    const plugins = useMemo(() => [...FC_PLUGINS], []);
    const interaction = useMemo(() => productionCalendarInteractionDisabled(), []);
    const renderEventContent = useCalendarEventContentRenderer();

    const events = useMemo(
      () => unifiedItems.map(unifiedItemToFullCalendarEvent) as EventSourceInput[],
      [unifiedItems],
    );

    const memoryCounterBase = useMemo(
      () => ({
        unifiedItemCount: unifiedItems.length,
        scheduleBlockCount,
        googleEventCount,
      }),
      [googleEventCount, scheduleBlockCount, unifiedItems.length],
    );

    useEffect(() => {
      logCalendarLifecycle('grid-mount');
      return () => {
        logCalendarLifecycle('grid-unmount');
      };
    }, []);

    const attemptTimingDiagnostic = useCallback((reason: string) => {
      const view = activeViewRef.current;
      if (view !== 'timeGridWeek' && view !== 'timeGridDay') {
        return;
      }

      const items = unifiedItemsRef.current;
      const fcApi = calendarRef.current?.getApi();
      if (!fcApi) {
        return;
      }

      const datesSet = lastDatesSetRef.current;
      const latchKey = `${view}:${datesSet?.startStr ?? 'no-range'}:${items.length}:${timeZone}`;
      if (timingDiagLatchRef.current === latchKey) {
        return;
      }

      const fired = tryEmitCalendarTimingDiagnostic({
        reason,
        datesSet,
        profileTimeZone: timeZone,
        fullCalendarTimeZoneProp: timeZone,
        fcApiTimeZoneOption: typeof fcApi.getOption === 'function'
          ? String(fcApi.getOption('timeZone') ?? '')
          : null,
        unifiedItems: items,
        fcEvents: fcApi.getEvents(),
      });

      if (fired) {
        timingDiagLatchRef.current = latchKey;
      }
    }, [timeZone]);

    useEffect(() => {
      if (!timeZoneReady) {
        return;
      }

      const api = calendarRef.current?.getApi();
      if (api && typeof api.setOption === 'function') {
        api.setOption('timeZone', timeZone);
      }

      if (import.meta.env.DEV) {
        console.info('[calendar-timezone]', {
          boundary: 'CalendarGridHost',
          fullCalendarTimeZoneProp: timeZone,
          fcApiTimeZoneOption: api && typeof api.getOption === 'function'
            ? api.getOption('timeZone')
            : null,
        });
      }
    }, [timeZone, timeZoneReady]);

    useEffect(() => {
      if (!timeZoneReady) {
        return;
      }

      const view = activeViewRef.current;
      if (view !== 'timeGridWeek' && view !== 'timeGridDay') {
        return;
      }

      if (unifiedItems.length === 0) {
        return;
      }

      const frame = window.requestAnimationFrame(() => {
        attemptTimingDiagnostic('events-loaded');
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }, [attemptTimingDiagnostic, timeZoneReady, unifiedItems]);

    const getApi = useCallback((): CalendarWorkspaceApi | null => {
      const api = calendarRef.current?.getApi();
      if (!api) {
        return null;
      }
      return api as unknown as CalendarWorkspaceApi;
    }, []);

    useImperativeHandle(imperativeRef, () => ({
      gotoDate: (date: string) => {
        getApi()?.gotoDate(date);
      },
      applyMonthSelection: (command: MonthSelectCommand) => {
        const api = getApi();
        if (!api) {
          return;
        }
        api.changeView(command.view);
        api.gotoDate(command.gotoDate);
        setActiveView('dayGridMonth');
        onViewChange?.('dayGridMonth');
      },
    }));

    const handleDatesSet = useCallback((arg: DatesSetArg) => {
      const type = arg.view.type;
      if (isCalendarWorkspaceView(type)) {
        setActiveView(type);
        activeViewRef.current = type;
        onViewChange?.(type);
        if (type !== 'timeGridWeek' && type !== 'timeGridDay') {
          timingDiagLatchRef.current = null;
        }
      }
      lastDatesSetRef.current = arg;
      setViewTitle(arg.view.title);
      onRangeChange(arg.start.toISOString(), arg.end.toISOString());
      const focusIso = viewInstantToPlainDateIso(arg.view.currentStart, timeZone);
      onFocusDateChange(focusIso);

      const range = formatDatesSetRange(arg);
      const fullCalendarEventCount = calendarRef.current?.getApi()?.getEvents().length;
      logCalendarMemoryCounters({
        reason: 'datesSet',
        view: range.view,
        visibleStart: range.visibleStart,
        visibleEnd: range.visibleEnd,
        fullCalendarEventCount,
        ...memoryCounterBase,
      });

      if (type === 'timeGridWeek' || type === 'timeGridDay') {
        window.requestAnimationFrame(() => {
          attemptTimingDiagnostic('datesSet');
        });
      }
    }, [attemptTimingDiagnostic, memoryCounterBase, onFocusDateChange, onRangeChange, onViewChange, timeZone]);

    const handleEventClick = useCallback((arg: EventClickArg) => {
      const unifiedItemId = arg.event.extendedProps.unifiedItemId as string | undefined;
      if (!unifiedItemId) {
        return;
      }
      const item = unifiedItemsRef.current.find((entry) => entry.id === unifiedItemId);
      if (item) {
        onEventSelected(item);
      }
    }, [onEventSelected]);

    const handlePrevious = useCallback(() => {
      const api = getApi();
      if (api) {
        calendarToolbarPrevious(api);
      }
    }, [getApi]);

    const handleNext = useCallback(() => {
      const api = getApi();
      if (api) {
        calendarToolbarNext(api);
      }
    }, [getApi]);

    const handleToday = useCallback(() => {
      const api = getApi();
      if (api) {
        calendarToolbarToday(api);
        setActiveView('dayGridMonth');
        onViewChange?.('dayGridMonth');
      }
    }, [getApi, onViewChange]);

    const handleChangeView = useCallback((view: CalendarWorkspaceView) => {
      const api = getApi();
      if (api) {
        const fromView = api.view.type;
        if (fromView === 'multiMonthYear' && view !== 'multiMonthYear') {
          calendarToolbarChangeViewFromYear(api, view, timeZone);
        } else {
          calendarToolbarChangeView(api, view);
        }
        setActiveView(view);
        onViewChange?.(view);
        logCalendarMemoryCounters({
          reason: 'calendar-view-change',
          view,
          fullCalendarEventCount: api.getEvents().length,
          ...memoryCounterBase,
        });
        void window.diagnosticsApi?.reportRendererMemoryDetail?.(`calendar-view-change:${view}`);
      }
    }, [getApi, memoryCounterBase, onViewChange, timeZone]);

    return (
      <UnifiedCalendarItemsProvider itemsById={itemsById}>
        <div className="calendar-main-pane">
          <CalendarToolbar
            title={viewTitle}
            activeView={activeView}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToday={handleToday}
            onChangeView={handleChangeView}
          />
          <div className="calendar-grid-host">
            {timeZoneReady ? (
              <FullCalendar
                key={timeZone}
                ref={calendarRef}
                plugins={plugins}
                initialView="dayGridMonth"
                headerToolbar={false}
                timeZone={timeZone}
                events={events}
                height="100%"
                {...interaction}
                eventContent={renderEventContent}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}
              />
            ) : (
              <p className="task-panel-message" role="status">Loading calendar timezone…</p>
            )}
            <CalendarMascotLayer />
          </div>
        </div>
      </UnifiedCalendarItemsProvider>
    );
  },
);
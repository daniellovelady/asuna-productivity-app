import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { installCalendarMemoryReproHarness } from '../../diagnostics/calendarMemoryReproHarness';
import { logCalendarMemoryCounters } from '../../diagnostics/calendarMemoryDiag';
import { logCalendarLifecycle } from '../../diagnostics/calendarLifecycleDiag';
import type { GoogleEventItem, UnifiedCalendarItem } from '../../../shared/calendar/unifiedCalendarItem';
import { LinkTaskToEventDialog } from '../LinkTaskToEventDialog';
import { useCalendarWorkspace } from '../../hooks/useCalendarWorkspace';
import { useTasks } from '../../hooks/useTasks';
import type { CalendarEvent } from '../../../shared/calendar/types';
import { CalendarAccountBanner } from './CalendarAccountBanner';
import { CalendarGridHost, type CalendarGridHostHandle } from './CalendarGridHost';
import { CalendarSourceVisibility } from './CalendarSourceVisibility';
import { CalendarEventDetailDialog } from './CalendarEventDetailDialog';
import { CalendarNavigator } from './CalendarNavigator';
import { TaskSchedulingDrawer } from './TaskSchedulingDrawer';
import './calendar-workspace.css';

export function CalendarWorkspaceView(): JSX.Element {
  const workspace = useCalendarWorkspace();

  useEffect(() => {
    logCalendarLifecycle('workspace-mount');
    return () => {
      logCalendarLifecycle('workspace-unmount');
    };
  }, []);

  useEffect(() => {
    installCalendarMemoryReproHarness();
  }, []);
  const { tasks, loadStatus: tasksLoadStatus, loadError: tasksLoadError, reloadTasks } = useTasks();
  const gridRef = useRef<CalendarGridHostHandle>(null);
  const [selectedDetail, setSelectedDetail] = useState<UnifiedCalendarItem | null>(null);
  const [linkEvent, setLinkEvent] = useState<CalendarEvent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [focusDateIso, setFocusDateIso] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: workspace.timeZone }).format(new Date()),
  );

  const nowMs = useMemo(() => Date.now(), [workspace.unifiedItems.length]);

  const account = workspace.agenda.state?.account;
  const needsReauth = account?.status === 'reauth_required';
  const isSyncing = workspace.agenda.state?.syncPhase === 'syncing';

  const setVisibleRange = workspace.setVisibleRange;
  const setVisibility = workspace.setVisibility;

  const handleRangeChange = useCallback((rangeStart: string, rangeEnd: string) => {
    setVisibleRange({ rangeStart, rangeEnd });
  }, [setVisibleRange]);

  const googleItemToCalendarEvent = useCallback((item: GoogleEventItem): CalendarEvent => ({
    externalEventId: item.externalEventId,
    calendarId: item.calendarId,
    calendarName: item.calendarName,
    title: item.title,
    startAt: item.start,
    endAt: item.end,
    allDay: item.allDay,
    location: item.location,
    status: 'confirmed',
    provider: 'google',
    lastSyncedAt: new Date().toISOString(),
    linkedTaskId: item.linkedTaskId,
    mirrorScheduleBlockId: item.mirrorScheduleBlockId,
  }), []);

  const handleStartFocus = async () => {
    if (!selectedDetail || selectedDetail.source !== 'google_calendar') {
      return;
    }
    setActionError(null);
    try {
      if (selectedDetail.linkedTaskId) {
        const linkedTask = tasks.find((task) => task.id === selectedDetail.linkedTaskId);
        if (linkedTask) {
          const { calendarBridgeService } = await import('../../services/calendarBridgeService');
          await calendarBridgeService.startFocusFromEventWithLink(
            selectedDetail.calendarId,
            selectedDetail.externalEventId,
            linkedTask.id,
            linkedTask.title,
          );
          return;
        }
      }
      await workspace.agenda.startFocusFromEvent(
        selectedDetail.calendarId,
        selectedDetail.externalEventId,
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not start focus.');
    }
  };

  return (
    <section className="calendar-workspace" aria-label="Calendar">
      <div className="calendar-workspace__header">
        <h2 className="settings-title">Calendar</h2>
        <button
          type="button"
          className="refresh-button"
          onClick={() => void workspace.agenda.refresh().then(() => workspace.reloadRange())}
          disabled={isSyncing || needsReauth}
        >
          Refresh
        </button>
      </div>

      {actionError ? <p className="settings-error" role="alert">{actionError}</p> : null}

      <CalendarAccountBanner
        account={account}
        isLoading={workspace.agenda.isLoading}
        isSyncing={isSyncing}
        error={workspace.agenda.error}
        onConnect={() => void workspace.agenda.connect()}
        onReconnect={() => void workspace.agenda.connect()}
        onRefresh={() => void workspace.agenda.refresh()}
        showStaleCacheHint={Boolean(needsReauth && workspace.googleEvents.length > 0)}
        lastSyncedAt={account?.lastSyncedAt ?? null}
      />

      {(workspace.blocksLoading || workspace.googleLoading) ? (
        <p className="task-panel-message" role="status">Updating calendar range…</p>
      ) : null}

      <div className="calendar-workspace__layout">
        <aside className="calendar-left-panel">
          <CalendarNavigator
            timeZone={workspace.timeZone}
            focusDateIso={focusDateIso}
            onSelectDate={(date) => {
              setFocusDateIso(date);
              gridRef.current?.gotoDate(date);
            }}
            onSelectMonth={(command) => {
              gridRef.current?.applyMonthSelection(command);
            }}
          />
          <CalendarSourceVisibility
            visibility={workspace.visibility}
            calendarList={workspace.calendarList}
            onChange={(next) => {
              setVisibility(next);
              logCalendarMemoryCounters({
                reason: 'calendar-source-toggle',
                unifiedItemCount: workspace.unifiedItems.length,
                googleEventCount: workspace.googleEvents.length,
                scheduleBlockCount: workspace.scheduleBlocks.length,
              });
            }}
          />
          <TaskSchedulingDrawer scheduleBlocks={workspace.scheduleBlocks} nowMs={nowMs} />
        </aside>

        <CalendarGridHost
          ref={gridRef}
          timeZone={workspace.timeZone}
          timeZoneReady={workspace.timeZoneReady}
          unifiedItems={workspace.unifiedItems}
          scheduleBlockCount={workspace.scheduleBlocks.length}
          googleEventCount={workspace.googleEvents.length}
          onRangeChange={handleRangeChange}
          onFocusDateChange={setFocusDateIso}
          onEventSelected={setSelectedDetail}
        />
      </div>

      <CalendarEventDetailDialog
        item={selectedDetail}
        onClose={() => setSelectedDetail(null)}
        googleActionsDisabled={isSyncing || needsReauth}
        onStartFocusGoogle={() => void handleStartFocus()}
        onLinkTaskGoogle={() => {
          if (selectedDetail?.source === 'google_calendar') {
            setLinkEvent(googleItemToCalendarEvent(selectedDetail));
          }
        }}
      />

      {linkEvent ? (
        <LinkTaskToEventDialog
          event={linkEvent}
          tasks={tasks}
          tasksLoadStatus={tasksLoadStatus}
          tasksLoadError={tasksLoadError}
          onClose={() => setLinkEvent(null)}
          onLinked={() => void workspace.agenda.reload()}
          onRetryLoadTasks={() => void reloadTasks()}
        />
      ) : null}
    </section>
  );
}
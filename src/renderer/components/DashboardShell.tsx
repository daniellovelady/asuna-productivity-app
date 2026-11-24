import { useEffect, useState } from 'react';
import { logDashboardNavigation } from '../diagnostics/dashboardLifecycleDiag';
import { useRendererBootMarker } from '../diagnostics/useRendererBootMarker';
import { AssistantPlaceholder } from './AssistantPlaceholder';
import { CurrentTaskCard } from './CurrentTaskCard';
import { FocusTimer } from './FocusTimer';
import { InsightsView } from './InsightsView';
import { SessionHistory } from './SessionHistory';
import { CalendarWorkspaceView } from './calendar/CalendarWorkspaceView';
import { SettingsView } from './SettingsView';
import { showsDashboardOverview, type AppView } from '../navigation/appNavigation';
import { Sidebar } from './Sidebar';
import { Statistics } from './Statistics';
import { TaskPanel } from './TaskPanel';
import { TrackingControls } from './TrackingControls';
import { useAnalytics } from '../hooks/useAnalytics';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { useAssistant } from '../hooks/useAssistant';
import { useAuth } from '../hooks/useAuth';
import { useBreakSession } from '../hooks/useBreakSession';
import { useFocusSession } from '../hooks/useFocusSession';
import { useFocusHistory } from '../hooks/useFocusHistory';
import { useTasks } from '../hooks/useTasks';
import { usePreferences } from '../context/PreferencesProvider';
import { useNotificationVariationBridge } from '../hooks/useNotificationVariationBridge';

export function DashboardShell(): JSX.Element {
  useRendererBootMarker('DashboardShell-mounted');
  useNotificationVariationBridge();
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  useEffect(() => {
    logDashboardNavigation(activeView);
  }, [activeView]);
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { selectedTaskId, selectedTask } = useTasks();
  const { reloadHistory } = useFocusHistory();
  const { reloadAnalytics } = useAnalytics();
  const focusSession = useFocusSession(selectedTaskId, {
    selectedTaskTitle: selectedTask?.title ?? null,
    onSessionSaved: async () => {
      await reloadHistory();
      await reloadAnalytics();
    },
  });
  const activityTracking = useActivityTracking(user !== null, user?.id ?? null);
  const breakSession = useBreakSession();
  const assistant = useAssistant();
  const selectionLocked = focusSession.hasUnsavedCompletion
    || focusSession.isRunning
    || focusSession.isPaused
    || breakSession.isBreakActive;

  return (
    <div className="dashboard-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className={`main-content${activeView === 'agenda' ? ' main-content--calendar' : ''}`}>
        {activeView === 'insights' ? (
          <InsightsView />
        ) : activeView === 'settings' ? (
          <SettingsView />
        ) : activeView === 'agenda' ? (
          <CalendarWorkspaceView />
        ) : activeView === 'tasks' ? (
          <section className="tasks-view" aria-label="Tasks">
            <h2 className="settings-title">Tasks</h2>
            <TaskPanel selectionLocked={selectionLocked} />
          </section>
        ) : activeView === 'history' ? (
          <section className="history-view" aria-label="History">
            <h2 className="settings-title">History</h2>
            <SessionHistory />
          </section>
        ) : showsDashboardOverview(activeView) ? (
          <>
            <div className="top-row">
              <CurrentTaskCard />
              <FocusTimer focusSession={focusSession} breakSession={breakSession} />
            </div>
            <TrackingControls
              statusLabel={activityTracking.statusLabel}
              preferenceHint={activityTracking.preferenceHint}
              trackingState={activityTracking.state}
              error={activityTracking.error}
              isLoading={activityTracking.isLoading}
              onEnable={() => {
                void activityTracking.enable();
              }}
              onDisable={() => {
                void activityTracking.disable();
              }}
              onPause={() => {
                void activityTracking.pause();
              }}
              onResume={() => {
                void activityTracking.resume();
              }}
            />
            <div className="dashboard-grid">
              <TaskPanel selectionLocked={selectionLocked} />
              <SessionHistory />
            </div>
            <Statistics />
          </>
        ) : null}
      </main>
      <AssistantPlaceholder
        currentMessage={assistant.currentMessage}
        avatarStyle={preferences.avatarStyle}
        onAction={assistant.executeAction}
      />
    </div>
  );
}

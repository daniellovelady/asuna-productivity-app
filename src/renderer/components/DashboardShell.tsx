import { useState } from 'react';
import { AssistantPlaceholder } from './AssistantPlaceholder';
import { CurrentTaskCard } from './CurrentTaskCard';
import { FocusTimer } from './FocusTimer';
import { InsightsView } from './InsightsView';
import { SessionHistory } from './SessionHistory';
import { Sidebar, type AppView } from './Sidebar';
import { Statistics } from './Statistics';
import { TaskPanel } from './TaskPanel';
import { TrackingControls } from './TrackingControls';
import { useAnalytics } from '../hooks/useAnalytics';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { useAssistant } from '../hooks/useAssistant';
import { useAuth } from '../hooks/useAuth';
import { useFocusSession } from '../hooks/useFocusSession';
import { useFocusHistory } from '../hooks/useFocusHistory';
import { useTasks } from '../hooks/useTasks';

export function DashboardShell(): JSX.Element {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const { user } = useAuth();
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
  const assistant = useAssistant();
  const selectionLocked = focusSession.hasUnsavedCompletion
    || focusSession.isRunning
    || focusSession.isPaused;

  return (
    <div className="dashboard-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main-content">
        {activeView === 'insights' ? (
          <InsightsView />
        ) : (
          <>
            <div className="top-row">
              <CurrentTaskCard />
              <FocusTimer focusSession={focusSession} />
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
        )}
      </main>
      <AssistantPlaceholder
        currentMessage={assistant.currentMessage}
        onDismiss={(messageId) => {
          void assistant.dismiss(messageId);
        }}
      />
    </div>
  );
}

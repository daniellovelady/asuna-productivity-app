import { AssistantPlaceholder } from './AssistantPlaceholder';
import { CurrentTaskCard } from './CurrentTaskCard';
import { FocusTimer } from './FocusTimer';
import { SessionHistory } from './SessionHistory';
import { Sidebar } from './Sidebar';
import { Statistics } from './Statistics';
import { TaskPanel } from './TaskPanel';
import { useFocusSession } from '../hooks/useFocusSession';
import { useFocusHistory } from '../hooks/useFocusHistory';
import { useTasks } from '../hooks/useTasks';

export function DashboardShell(): JSX.Element {
  const { selectedTaskId, selectedTask } = useTasks();
  const { reloadHistory } = useFocusHistory();
  const focusSession = useFocusSession(selectedTaskId, {
    selectedTaskTitle: selectedTask?.title ?? null,
    onSessionSaved: reloadHistory,
  });
  const selectionLocked = focusSession.hasUnsavedCompletion
    || focusSession.isRunning
    || focusSession.isPaused;

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="main-content">
        <div className="top-row">
          <CurrentTaskCard />
          <FocusTimer focusSession={focusSession} />
        </div>
        <div className="dashboard-grid">
          <TaskPanel selectionLocked={selectionLocked} />
          <SessionHistory />
        </div>
        <Statistics />
      </main>
      <AssistantPlaceholder />
    </div>
  );
}

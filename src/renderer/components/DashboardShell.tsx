import { AssistantPlaceholder } from './AssistantPlaceholder';
import { CurrentTaskCard } from './CurrentTaskCard';
import { FocusTimer } from './FocusTimer';
import { Sidebar } from './Sidebar';
import { Statistics } from './Statistics';

export function DashboardShell(): JSX.Element {
  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="main-content">
        <div className="top-row">
          <CurrentTaskCard />
          <FocusTimer />
        </div>
        <Statistics />
      </main>
      <AssistantPlaceholder />
    </div>
  );
}

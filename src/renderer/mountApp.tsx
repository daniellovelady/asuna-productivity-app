import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AnalyticsProvider } from './context/AnalyticsProvider';
import { AuthProvider } from './context/AuthProvider';
import { FocusHistoryProvider } from './context/FocusHistoryProvider';
import { TaskProvider } from './context/TaskProvider';

export function mountApp(root: HTMLElement): void {
  createRoot(root).render(
    <AuthProvider>
      <TaskProvider>
        <FocusHistoryProvider>
          <AnalyticsProvider>
            <App />
          </AnalyticsProvider>
        </FocusHistoryProvider>
      </TaskProvider>
    </AuthProvider>,
  );
}

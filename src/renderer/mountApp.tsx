import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AnalyticsProvider } from './context/AnalyticsProvider';
import { AuthProvider } from './context/AuthProvider';
import { FocusHistoryProvider } from './context/FocusHistoryProvider';
import { PreferencesProvider } from './context/PreferencesProvider';
import { TaskProvider } from './context/TaskProvider';
import { RendererErrorBoundary } from './diagnostics/RendererErrorBoundary';
import { rendererBootLog } from './diagnostics/rendererBoot';

export function mountApp(root: HTMLElement): void {
  rendererBootLog('before-create-root');
  const reactRoot = createRoot(root);
  rendererBootLog('root-created');
  rendererBootLog('before-root-render');
  reactRoot.render(
    <RendererErrorBoundary>
      <AuthProvider>
        <PreferencesProvider>
          <TaskProvider>
            <FocusHistoryProvider>
              <AnalyticsProvider>
                <App />
              </AnalyticsProvider>
            </FocusHistoryProvider>
          </TaskProvider>
        </PreferencesProvider>
      </AuthProvider>
    </RendererErrorBoundary>,
  );
  rendererBootLog('root-render-called');
}

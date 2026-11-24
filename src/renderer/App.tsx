import { AuthScreen } from './components/AuthScreen';
import { DashboardShell } from './components/DashboardShell';
import { FullCalendarSpike } from './components/dev/FullCalendarSpike';
import { useRendererBootMarker } from './diagnostics/useRendererBootMarker';
import { useAuth } from './hooks/useAuth';

export function App(): JSX.Element {
  useRendererBootMarker('App-mounted');
  const { session, isLoading } = useAuth();

  if (import.meta.env.DEV && import.meta.env.VITE_FULLCALENDAR_SPIKE === '1') {
    return <FullCalendarSpike />;
  }

  if (isLoading) {
    return (
      <div className="auth-screen">
        <p className="auth-loading">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <DashboardShell />;
}

import { AuthScreen } from './components/AuthScreen';
import { DashboardShell } from './components/DashboardShell';
import { useAuth } from './hooks/useAuth';

export function App(): JSX.Element {
  const { session, isLoading } = useAuth();

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

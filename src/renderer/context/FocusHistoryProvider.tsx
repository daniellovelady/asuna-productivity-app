import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import { focusSessionCloudService } from '../services/focusSessionCloudService';
import type { EndedSession } from '../types/focusSession';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

type FocusHistoryContextValue = {
  sessions: EndedSession[];
  loadStatus: LoadStatus;
  loadError: string | null;
  reloadHistory: () => Promise<void>;
};

const FocusHistoryContext = createContext<FocusHistoryContextValue | null>(null);

export function FocusHistoryProvider({ children }: { children: ReactNode }): JSX.Element {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<EndedSession[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadHistory = useCallback(async () => {
    if (!session) {
      setSessions([]);
      setLoadStatus('idle');
      setLoadError(null);
      return;
    }

    setLoadStatus('loading');
    setLoadError(null);

    try {
      const nextSessions = await focusSessionCloudService.listEndedSessions();
      setSessions(nextSessions);
      setLoadStatus('success');
    } catch (reloadError) {
      const message = reloadError instanceof Error
        ? reloadError.message
        : 'Failed to load session history.';
      setLoadError(message);
      setLoadStatus('error');
    }
  }, [session]);

  useEffect(() => {
    void reloadHistory();
  }, [reloadHistory]);

  const value = useMemo(
    () => ({
      sessions,
      loadStatus,
      loadError,
      reloadHistory,
    }),
    [sessions, loadStatus, loadError, reloadHistory],
  );

  return (
    <FocusHistoryContext.Provider value={value}>{children}</FocusHistoryContext.Provider>
  );
}

export function useFocusHistoryContext(): FocusHistoryContextValue {
  const context = useContext(FocusHistoryContext);

  if (!context) {
    throw new Error('useFocusHistory must be used within a FocusHistoryProvider.');
  }

  return context;
}

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
import { analyticsService } from '../services/analyticsService';
import type { AnalyticsSnapshot } from '../types/analytics';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

type AnalyticsContextValue = {
  snapshot: AnalyticsSnapshot | null;
  loadStatus: LoadStatus;
  loadError: string | null;
  reloadAnalytics: () => Promise<void>;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }): JSX.Element {
  const { session } = useAuth();
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadAnalytics = useCallback(async () => {
    if (!session) {
      setSnapshot(null);
      setLoadStatus('idle');
      setLoadError(null);
      return;
    }

    setLoadStatus('loading');
    setLoadError(null);

    try {
      const nextSnapshot = await analyticsService.fetchSnapshot();
      setSnapshot(nextSnapshot);
      setLoadStatus('success');
    } catch (reloadError) {
      const message = reloadError instanceof Error
        ? reloadError.message
        : 'Failed to load analytics.';
      setLoadError(message);
      setLoadStatus('error');
    }
  }, [session]);

  useEffect(() => {
    void reloadAnalytics();
  }, [reloadAnalytics]);

  const value = useMemo(
    () => ({
      snapshot,
      loadStatus,
      loadError,
      reloadAnalytics,
    }),
    [snapshot, loadStatus, loadError, reloadAnalytics],
  );

  return (
    <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
  );
}

export function useAnalyticsContext(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);

  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider.');
  }

  return context;
}

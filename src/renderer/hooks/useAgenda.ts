import { useCallback, useEffect, useState } from 'react';
import type { CalendarPublicState } from '../../shared/calendar/types';
import { calendarBridgeService } from '../services/calendarBridgeService';
import { listCalendarEventTaskLinks } from '../services/calendarEventTaskLinkService';
import { useAuth } from './useAuth';

export function useAgenda() {
  const { authContextReady } = useAuth();
  const [state, setState] = useState<CalendarPublicState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncLinks = useCallback(async () => {
    try {
      const links = await listCalendarEventTaskLinks();
      await calendarBridgeService.hydrateLinks(
        links.map((link) => ({
          externalCalendarId: link.externalCalendarId,
          externalEventId: link.externalEventId,
          taskId: link.taskId,
        })),
      );
    } catch {
      // Links are optional for agenda display.
    }
  }, []);

  const refreshState = useCallback(async () => {
    if (!authContextReady) {
      return;
    }

    try {
      const next = await calendarBridgeService.getState();
      setState(next);
      setError(null);
      await syncLinks();
      const hydrated = await calendarBridgeService.getState();
      setState(hydrated);
    } catch (refreshError) {
      const message = refreshError instanceof Error
        ? refreshError.message
        : 'Could not load agenda.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authContextReady, syncLinks]);

  useEffect(() => {
    if (!authContextReady) {
      setIsLoading(true);
      return undefined;
    }

    void refreshState();

    const unsubscribe = calendarBridgeService.onStateChanged((next) => {
      setState(next);
    });

    return unsubscribe;
  }, [authContextReady, refreshState]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const next = await calendarBridgeService.connect();
      setState(next);
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : 'Connect failed.';
      setError(message);
      throw connectError;
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    const next = await calendarBridgeService.disconnect();
    setState(next);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    const next = await calendarBridgeService.refresh();
    setState(next);
    await syncLinks();
    const hydrated = await calendarBridgeService.getState();
    setState(hydrated);
  }, [syncLinks]);

  const startFocusFromEvent = useCallback(async (calendarId: string, externalEventId: string) => {
    await calendarBridgeService.startFocusFromEvent(calendarId, externalEventId);
  }, []);

  return {
    state,
    error,
    isLoading,
    connect,
    disconnect,
    refresh,
    startFocusFromEvent,
    reload: refreshState,
  };
}

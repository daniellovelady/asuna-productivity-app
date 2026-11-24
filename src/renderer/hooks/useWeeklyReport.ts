import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { authService } from '../services/authService';
import { weeklyInsightService } from '../services/weeklyInsightService';
import { CoachServiceError } from '../services/coachService';
import type { WeeklyInsightReport } from '../types/weeklyInsight';

export function useWeeklyReport() {
  const { user, isLoading, authContextReady } = useAuth();
  const [report, setReport] = useState<WeeklyInsightReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const requestSequence = useRef(0);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      userIdRef.current = null;
      setReport(null);
      setError(null);
      setIsStale(false);
      return;
    }

    if (userIdRef.current !== null && userIdRef.current !== user.id) {
      setReport(null);
      setError(null);
      setIsStale(false);
    }

    userIdRef.current = user.id;
  }, [user]);

  const generate = useCallback(async () => {
    if (isLoading || !authContextReady) {
      setError('Authentication is still loading. Try again in a moment.');
      return;
    }

    const session = await authService.getSession();
    const accessToken = session?.access_token;
    const requestUserId = session?.user?.id ?? user?.id ?? null;

    if (!accessToken || !requestUserId) {
      setError('You must be signed in to generate a weekly report.');
      return;
    }

    const sequence = ++requestSequence.current;
    setIsLoadingReport(true);
    setError(null);

    try {
      const response = await weeklyInsightService.generate(accessToken);
      if (sequence !== requestSequence.current || userIdRef.current !== requestUserId) {
        return;
      }

      if (response.report) {
        setReport(response.report);
        setIsStale(false);
      }
      setError(null);
    } catch (generateError) {
      if (sequence !== requestSequence.current || userIdRef.current !== requestUserId) {
        return;
      }

      const message = generateError instanceof CoachServiceError
        ? generateError.message
        : 'Weekly report request failed.';
      setError(message);
      if (report !== null) {
        setIsStale(true);
      }
    } finally {
      if (sequence === requestSequence.current) {
        setIsLoadingReport(false);
      }
    }
  }, [authContextReady, isLoading, report, user?.id]);

  return {
    report,
    isLoading: isLoadingReport,
    error,
    isStale,
    generate,
  };
}
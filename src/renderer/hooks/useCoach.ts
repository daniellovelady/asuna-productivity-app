import { useCallback, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { coachService, CoachServiceError } from '../services/coachService';
import type { CoachAnalyzeResponse } from '../types/coachApi';

export function useCoach() {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CoachAnalyzeResponse | null>(null);
  const requestSequence = useRef(0);

  const analyze = useCallback(async (question: string) => {
    if (!session?.access_token) {
      setError('You must be signed in to use the coach.');
      return;
    }

    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await coachService.analyze(session.access_token, question);
      if (sequence !== requestSequence.current) {
        return;
      }
      setResponse(result);
      setError(null);
    } catch (analyzeError) {
      if (sequence !== requestSequence.current) {
        return;
      }
      const message = analyzeError instanceof CoachServiceError
        ? analyzeError.message
        : 'Coach request failed.';
      setError(message);
      setResponse(null);
    } finally {
      if (sequence === requestSequence.current) {
        setIsLoading(false);
      }
    }
  }, [session?.access_token]);

  const reset = useCallback(() => {
    requestSequence.current += 1;
    setError(null);
    setResponse(null);
  }, []);

  return {
    isLoading,
    error,
    response,
    analyze,
    reset,
  };
}

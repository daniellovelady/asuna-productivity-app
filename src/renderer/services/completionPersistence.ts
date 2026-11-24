import type { FocusPersistenceContext } from '../../shared/focus/focusStartIntent';
import type { CompletedFocusSession } from '../../shared/focus/types';

export interface CompletionPersistenceDeps {
  saveEndedSession: (
    completed: CompletedFocusSession,
    persistence: FocusPersistenceContext,
  ) => Promise<unknown>;
  acknowledgeCompletion: (sessionId: string) => Promise<unknown>;
}

export interface CompletionPersistenceState {
  savingSessionId: string | null;
  saveError: string | null;
}

export function createCompletionPersistence(deps: CompletionPersistenceDeps) {
  let savingSessionId: string | null = null;
  let saveError: string | null = null;

  const getState = (): CompletionPersistenceState => ({
    savingSessionId,
    saveError,
  });

  const persistPendingCompletion = async (
    completed: CompletedFocusSession,
    persistence: FocusPersistenceContext,
  ): Promise<boolean> => {
    if (savingSessionId === completed.id) {
      return false;
    }

    savingSessionId = completed.id;
    saveError = null;

    try {
      await deps.saveEndedSession(completed, persistence);
      await deps.acknowledgeCompletion(completed.id);
      savingSessionId = null;
      return true;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Session finished but could not be saved.';
      saveError = message;
      savingSessionId = null;
      return false;
    }
  };

  const clearSaveError = (): void => {
    saveError = null;
  };

  return {
    getState,
    persistPendingCompletion,
    clearSaveError,
  };
}

export type CompletionPersistence = ReturnType<typeof createCompletionPersistence>;

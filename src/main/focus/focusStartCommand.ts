import type { FocusStartIntent } from '../../shared/focus/focusStartIntent';
import { FocusEngineError, FocusEngineState } from '../../shared/focus/types';
import { getAuthContextSnapshot } from '../auth/authContextSnapshot';
import { handleFocusSessionStarted } from '../activity/focusStartBridge';
import { getBreakEngine } from './breakEngine';
import { getFocusEngine } from './focusEngine';

export type FocusStartResult =
  | { ok: true; state: FocusEngineState }
  | { ok: false; reason: string };

let pendingFocusStartIntent: FocusStartIntent | null = null;

export function setPendingFocusStartIntent(intent: FocusStartIntent): void {
  pendingFocusStartIntent = intent;
}

export function clearPendingFocusStartIntent(): void {
  pendingFocusStartIntent = null;
}

export function tryStartFocus(intentOverride?: FocusStartIntent): FocusStartResult {
  const authUserId = getAuthContextSnapshot().userId;
  if (authUserId === null) {
    return { ok: false, reason: 'Sign-in context is not ready. Try again in a moment.' };
  }

  const focusEngine = getFocusEngine();
  const focusState = focusEngine.getState();

  if (focusState.pendingCompletion !== null) {
    return {
      ok: false,
      reason: 'Finish saving the previous session before starting a new one.',
    };
  }

  if (focusState.activeSession !== null) {
    return { ok: false, reason: 'A focus session is already active.' };
  }

  const breakEngine = getBreakEngine();
  const breakRestoreSnapshot = breakEngine.endEarly('superseded_by_focus');

  const intent = intentOverride ?? pendingFocusStartIntent ?? { kind: 'none' };
  pendingFocusStartIntent = null;

  try {
    const state = focusEngine.start(intent);
    try {
      handleFocusSessionStarted(intent, state);
    } catch {
      // Focus is already running; lifecycle confirmation must not roll back the session.
    }
    return { ok: true, state };
  } catch (error) {
    if (breakRestoreSnapshot !== null) {
      try {
        breakEngine.restoreBreak(breakRestoreSnapshot);
      } catch {
        // Break restoration failed; focus did not start.
      }
    }

    if (error instanceof FocusEngineError) {
      return { ok: false, reason: error.message };
    }

    return { ok: false, reason: 'Could not start focus session.' };
  }
}

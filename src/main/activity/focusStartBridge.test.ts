import { describe, expect, it, vi } from 'vitest';
import {
  buildFocusStartedTriggerInput,
  handleFocusSessionStarted,
  resolveFocusStartedContextPhrase,
} from './focusStartBridge';
import type { FocusStartIntent } from '../../shared/focus/focusStartIntent';
import type { FocusEngineState } from '../../shared/focus/types';

function stateWithSession(
  sessionId: string,
  minutes: number,
): FocusEngineState {
  return {
    activeSession: {
      id: sessionId,
      status: 'running',
      targetDurationMs: minutes * 60_000,
      elapsedFocusMs: 0,
      startedAt: 1_000,
      accumulatedPausedMs: 0,
      pauseStartedAt: null,
      interruptionCount: 0,
    },
    selectedDurationMinutes: minutes,
    pendingCompletion: null,
    activeFocusContext: { kind: 'none' },
    pendingFocusPersistence: null,
  };
}

describe('focusStartBridge', () => {
  it('builds no-context phrase for kind none', () => {
    expect(resolveFocusStartedContextPhrase({ kind: 'none' })).toBe('');
    const input = buildFocusStartedTriggerInput(
      { kind: 'none' },
      stateWithSession('session-1', 30),
    );
    expect(input?.facts.contextPhrase).toBe('');
    expect(input?.facts.minutes).toBe(30);
  });

  it('builds task context phrase from title snapshot', () => {
    const intent: FocusStartIntent = {
      kind: 'task',
      taskId: 'task-1',
      titleSnapshot: 'Finish Lab 4',
    };
    expect(resolveFocusStartedContextPhrase(intent)).toBe(' for Finish Lab 4');
  });

  it('builds calendar context phrase from trusted title snapshot', () => {
    const intent: FocusStartIntent = {
      kind: 'calendar_event',
      calendarId: 'cal-1',
      externalEventId: 'evt-1',
      titleSnapshot: 'Ethics, Law, & Cybersecurity',
      calendarProvider: 'google',
      linkedTaskId: 'task-9',
      linkedTaskTitleSnapshot: 'Linked task title',
    };
    expect(resolveFocusStartedContextPhrase(intent)).toBe(' for Ethics, Law, & Cybersecurity');
  });

  it('enqueues focus-start trigger once per session', () => {
    const enqueue = vi.fn(() => true);
    const intent: FocusStartIntent = {
      kind: 'task',
      taskId: 'task-1',
      titleSnapshot: 'Finish Lab 4',
    };

    const ok = handleFocusSessionStarted(intent, stateWithSession('session-abc', 30), { enqueue });

    expect(ok).toBe(true);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith({
      triggerKey: 'focus-start',
      facts: {
        minutes: 30,
        contextPhrase: ' for Finish Lab 4',
        sessionId: 'session-abc',
      },
      priorityScore: 85,
      dedupKey: 'focus-started:session-abc',
      sessionId: 'session-abc',
    });
  });
});

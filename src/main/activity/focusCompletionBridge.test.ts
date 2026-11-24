import { describe, expect, it, vi } from 'vitest';
import { handleFocusSessionCompleted, isFocusSessionCompleted } from './focusCompletionBridge';

describe('focusCompletionBridge', () => {
  const completed = {
    id: 'session-1',
    targetDurationMs: 25 * 60_000,
    elapsedFocusMs: 25 * 60_000,
    startedAt: 0,
    endedAt: 25 * 60_000,
    accumulatedPausedMs: 0,
  };

  const abandoned = {
    ...completed,
    elapsedFocusMs: 10 * 60_000,
  };

  it('detects completed sessions', () => {
    expect(isFocusSessionCompleted(completed)).toBe(true);
    expect(isFocusSessionCompleted(abandoned)).toBe(false);
  });

  it('enqueues celebration for completed sessions without cloud dependency', () => {
    const messages: string[] = [];
    const triggerEngine = {
      resetFocusEncouragement: vi.fn(),
      enqueueCelebration: () => {
        messages.push('celebration');
      },
    };

    handleFocusSessionCompleted(completed, triggerEngine);
    handleFocusSessionCompleted(abandoned, triggerEngine);

    expect(messages).toEqual(['celebration']);
  });

  it('resets focus encouragement state on every session completion', () => {
    const resetFocusEncouragement = vi.fn();
    const triggerEngine = {
      resetFocusEncouragement,
      enqueueCelebration: vi.fn(),
    };

    handleFocusSessionCompleted(completed, triggerEngine);
    handleFocusSessionCompleted(abandoned, triggerEngine);

    expect(resetFocusEncouragement).toHaveBeenCalledTimes(2);
  });
});

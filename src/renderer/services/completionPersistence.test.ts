import { describe, expect, it, vi } from 'vitest';
import { focusIntentToPersistenceContext } from '../../shared/focus/focusStartIntent';
import type { CompletedFocusSession } from '../../shared/focus/types';
import { createCompletionPersistence } from './completionPersistence';

const completed: CompletedFocusSession = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ownerUserId: 'user-id',
  targetDurationMs: 25 * 60_000,
  elapsedFocusMs: 25 * 60_000,
  startedAt: 1_000,
  endedAt: 2_000,
  accumulatedPausedMs: 0,
  interruptionCount: 0,
  breakTargetMinutes: 5,
  breakTargetOwnerMatched: true,
};

describe('createCompletionPersistence', () => {
  it('saves once and acknowledges on success', async () => {
    const saveEndedSession = vi.fn().mockResolvedValue({});
    const acknowledgeCompletion = vi.fn().mockResolvedValue({});

    const persistence = createCompletionPersistence({
      saveEndedSession,
      acknowledgeCompletion,
    });

    const persistenceContext = focusIntentToPersistenceContext({
      kind: 'task',
      taskId: 'task-id',
      titleSnapshot: 'Demo task',
    });
    const saved = await persistence.persistPendingCompletion(completed, persistenceContext);

    expect(saved).toBe(true);
    expect(saveEndedSession).toHaveBeenCalledWith(completed, persistenceContext);
    expect(acknowledgeCompletion).toHaveBeenCalledWith(completed.id);
    expect(persistence.getState().saveError).toBeNull();
  });

  it('skips duplicate in-flight save for the same session id', async () => {
    let resolveSave: (() => void) | undefined;
    const saveEndedSession = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );
    const acknowledgeCompletion = vi.fn().mockResolvedValue({});

    const persistence = createCompletionPersistence({
      saveEndedSession,
      acknowledgeCompletion,
    });

    const noneContext = focusIntentToPersistenceContext({ kind: 'none' });
    const first = persistence.persistPendingCompletion(completed, noneContext);
    const second = persistence.persistPendingCompletion(completed, noneContext);

    resolveSave?.();
    await first;
    const skipped = await second;

    expect(skipped).toBe(false);
    expect(saveEndedSession).toHaveBeenCalledTimes(1);
  });

  it('does not acknowledge when save fails', async () => {
    const saveEndedSession = vi.fn().mockRejectedValue(new Error('network down'));
    const acknowledgeCompletion = vi.fn().mockResolvedValue({});

    const persistence = createCompletionPersistence({
      saveEndedSession,
      acknowledgeCompletion,
    });

    const saved = await persistence.persistPendingCompletion(
      completed,
      focusIntentToPersistenceContext({ kind: 'none' }),
    );

    expect(saved).toBe(false);
    expect(acknowledgeCompletion).not.toHaveBeenCalled();
    expect(persistence.getState().saveError).toBe('network down');
  });

  it('allows retry after failure', async () => {
    const saveEndedSession = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({});
    const acknowledgeCompletion = vi.fn().mockResolvedValue({});

    const persistence = createCompletionPersistence({
      saveEndedSession,
      acknowledgeCompletion,
    });

    const noneContext = focusIntentToPersistenceContext({ kind: 'none' });
    await persistence.persistPendingCompletion(completed, noneContext);
    const retried = await persistence.persistPendingCompletion(completed, noneContext);

    expect(retried).toBe(true);
    expect(saveEndedSession).toHaveBeenCalledTimes(2);
    expect(acknowledgeCompletion).toHaveBeenCalledTimes(1);
  });
});

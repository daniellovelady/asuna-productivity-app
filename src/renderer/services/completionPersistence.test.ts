import { describe, expect, it, vi } from 'vitest';
import type { CompletedFocusSession } from '../../shared/focus/types';
import { createCompletionPersistence } from './completionPersistence';

const completed: CompletedFocusSession = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  targetDurationMs: 25 * 60_000,
  elapsedFocusMs: 25 * 60_000,
  startedAt: 1_000,
  endedAt: 2_000,
  accumulatedPausedMs: 0,
};

describe('createCompletionPersistence', () => {
  it('saves once and acknowledges on success', async () => {
    const saveEndedSession = vi.fn().mockResolvedValue({});
    const acknowledgeCompletion = vi.fn().mockResolvedValue({});

    const persistence = createCompletionPersistence({
      saveEndedSession,
      acknowledgeCompletion,
    });

    const saved = await persistence.persistPendingCompletion(completed, 'task-id', 'Demo task');

    expect(saved).toBe(true);
    expect(saveEndedSession).toHaveBeenCalledWith(completed, 'task-id', 'Demo task');
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

    const first = persistence.persistPendingCompletion(completed, null, null);
    const second = persistence.persistPendingCompletion(completed, null, null);

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

    const saved = await persistence.persistPendingCompletion(completed, null, null);

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

    await persistence.persistPendingCompletion(completed, null, null);
    const retried = await persistence.persistPendingCompletion(completed, null, null);

    expect(retried).toBe(true);
    expect(saveEndedSession).toHaveBeenCalledTimes(2);
    expect(acknowledgeCompletion).toHaveBeenCalledTimes(1);
  });
});

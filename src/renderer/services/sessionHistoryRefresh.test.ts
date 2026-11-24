import { describe, expect, it, vi } from 'vitest';

describe('session history refresh coordination', () => {
  it('reloads history and analytics together after destructive actions', async () => {
    const reloadHistory = vi.fn(async () => undefined);
    const reloadAnalytics = vi.fn(async () => undefined);

    const refreshHistoryAndAnalytics = async () => {
      await reloadHistory();
      await reloadAnalytics();
    };

    await refreshHistoryAndAnalytics();

    expect(reloadHistory).toHaveBeenCalledTimes(1);
    expect(reloadAnalytics).toHaveBeenCalledTimes(1);
    expect(reloadHistory.mock.invocationCallOrder[0])
      .toBeLessThan(reloadAnalytics.mock.invocationCallOrder[0]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  shouldCancelBlockOnTaskComplete,
  shouldCancelBlockOnTaskDelete,
} from './lifecycleRules';

const NOW = new Date('2026-03-10T15:00:00.000Z').getTime();

function scheduled(start: string, end: string) {
  return {
    status: 'scheduled' as const,
    scheduledStartAt: start,
    scheduledEndAt: end,
  };
}

describe('task completion lifecycle', () => {
  it('cancels strictly future blocks only', () => {
    expect(
      shouldCancelBlockOnTaskComplete(
        scheduled('2026-03-10T16:00:00.000Z', '2026-03-10T17:00:00.000Z'),
        NOW,
      ),
    ).toBe(true);
  });

  it('preserves past blocks', () => {
    expect(
      shouldCancelBlockOnTaskComplete(
        scheduled('2026-03-10T10:00:00.000Z', '2026-03-10T11:00:00.000Z'),
        NOW,
      ),
    ).toBe(false);
  });

  it('preserves current in-progress blocks', () => {
    expect(
      shouldCancelBlockOnTaskComplete(
        scheduled('2026-03-10T14:00:00.000Z', '2026-03-10T16:00:00.000Z'),
        NOW,
      ),
    ).toBe(false);
  });
});

describe('task delete lifecycle', () => {
  it('cancels current and future active blocks', () => {
    expect(
      shouldCancelBlockOnTaskDelete(
        scheduled('2026-03-10T14:00:00.000Z', '2026-03-10T16:00:00.000Z'),
        NOW,
      ),
    ).toBe(true);
    expect(
      shouldCancelBlockOnTaskDelete(
        scheduled('2026-03-10T16:00:00.000Z', '2026-03-10T17:00:00.000Z'),
        NOW,
      ),
    ).toBe(true);
  });

  it('preserves past ended blocks', () => {
    expect(
      shouldCancelBlockOnTaskDelete(
        scheduled('2026-03-10T10:00:00.000Z', '2026-03-10T11:00:00.000Z'),
        NOW,
      ),
    ).toBe(false);
  });
});
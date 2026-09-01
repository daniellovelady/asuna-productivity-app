import { describe, expect, it } from 'vitest';
import {
  computeBreakCompliance,
  findChronologicalNextSession,
} from './breakCompliance';
import type { FocusSessionForBreak } from './breakCompliance';

describe('findChronologicalNextSession', () => {
  it('returns the earliest later session by started_at', () => {
    const sessions: FocusSessionForBreak[] = [
      {
        id: 'prev',
        status: 'completed',
        startedAt: '2026-08-30T16:00:00.000Z',
        endedAt: '2026-08-30T17:00:00.000Z',
      },
      {
        id: 'next-earliest',
        status: 'completed',
        startedAt: '2026-08-30T17:02:00.000Z',
        endedAt: '2026-08-30T17:42:00.000Z',
      },
      {
        id: 'later-start',
        status: 'completed',
        startedAt: '2026-08-30T17:05:00.000Z',
        endedAt: '2026-08-30T17:20:00.000Z',
      },
    ];

    expect(findChronologicalNextSession(
      sessions,
      '2026-08-30T17:00:00.000Z',
    )?.id).toBe('next-earliest');
  });
});

describe('computeBreakCompliance', () => {
  it('returns null percent when there are no eligible pairs', () => {
    const result = computeBreakCompliance(
      [],
      '2026-08-25T05:00:00.000Z',
      '2026-09-01T05:00:00.000Z',
      5,
    );

    expect(result.eligibleCount).toBe(0);
    expect(result.compliantCount).toBe(0);
    expect(result.percent).toBeNull();
  });

  it('counts a running next session within 120 minutes', () => {
    const sessions: FocusSessionForBreak[] = [
      {
        id: 'prev',
        status: 'completed',
        startedAt: '2026-08-31T04:30:00.000Z',
        endedAt: '2026-08-31T04:50:00.000Z',
      },
      {
        id: 'next-running',
        status: 'running',
        startedAt: '2026-08-31T05:10:00.000Z',
        endedAt: null,
      },
    ];

    const result = computeBreakCompliance(
      sessions,
      '2026-08-25T05:00:00.000Z',
      '2026-09-01T05:00:00.000Z',
      5,
    );

    expect(result.eligibleCount).toBe(1);
    expect(result.compliantCount).toBe(1);
    expect(result.percent).toBe(100);
  });
});

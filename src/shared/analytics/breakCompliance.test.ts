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
        breakTargetMinutes: 5,
      },
      {
        id: 'next-earliest',
        status: 'completed',
        startedAt: '2026-08-30T17:02:00.000Z',
        endedAt: '2026-08-30T17:42:00.000Z',
        breakTargetMinutes: 5,
      },
      {
        id: 'later-start',
        status: 'completed',
        startedAt: '2026-08-30T17:05:00.000Z',
        endedAt: '2026-08-30T17:20:00.000Z',
        breakTargetMinutes: 5,
      },
    ];

    expect(findChronologicalNextSession(
      sessions,
      '2026-08-30T17:00:00.000Z',
    )?.id).toBe('next-earliest');
  });
});

describe('computeBreakCompliance', () => {
  const windowStart = '2026-08-25T05:00:00.000Z';
  const windowEnd = '2026-09-01T05:00:00.000Z';

  function completedSession(
    id: string,
    endedAt: string,
    startedAt: string,
    breakTargetMinutes = 5,
  ): FocusSessionForBreak {
    return {
      id,
      status: 'completed',
      startedAt,
      endedAt,
      breakTargetMinutes,
    };
  }

  it('returns null percent when there are no eligible pairs', () => {
    const result = computeBreakCompliance([], windowStart, windowEnd);

    expect(result.eligibleCount).toBe(0);
    expect(result.compliantCount).toBe(0);
    expect(result.percent).toBeNull();
  });

  it('marks a 3 minute gap as non-compliant when break target is 5', () => {
    const sessions = [
      completedSession('a', '2026-08-31T16:00:00.000Z', '2026-08-31T15:30:00.000Z'),
      {
        id: 'b',
        status: 'completed',
        startedAt: '2026-08-31T16:03:00.000Z',
        endedAt: '2026-08-31T16:30:00.000Z',
        breakTargetMinutes: 5,
      },
    ];

    const result = computeBreakCompliance(sessions, windowStart, windowEnd);

    expect(result.eligibleCount).toBe(1);
    expect(result.compliantCount).toBe(0);
    expect(result.percent).toBe(0);
  });

  it('marks exactly 5 and 10 minute gaps as compliant for target 5', () => {
    const fiveMinuteGap = computeBreakCompliance([
      completedSession('a5', '2026-08-31T16:00:00.000Z', '2026-08-31T15:30:00.000Z'),
      {
        id: 'b5',
        status: 'completed',
        startedAt: '2026-08-31T16:05:00.000Z',
        endedAt: '2026-08-31T16:30:00.000Z',
        breakTargetMinutes: 5,
      },
    ], windowStart, windowEnd);

    const tenMinuteGap = computeBreakCompliance([
      completedSession('a10', '2026-08-31T16:00:00.000Z', '2026-08-31T15:30:00.000Z'),
      {
        id: 'b10',
        status: 'completed',
        startedAt: '2026-08-31T16:10:00.000Z',
        endedAt: '2026-08-31T16:30:00.000Z',
        breakTargetMinutes: 5,
      },
    ], windowStart, windowEnd);

    expect(fiveMinuteGap.compliantCount).toBe(1);
    expect(tenMinuteGap.compliantCount).toBe(1);
  });

  it('includes exactly 120 minute gaps and excludes longer gaps', () => {
    const exactly120 = computeBreakCompliance([
      completedSession('a120', '2026-08-31T16:00:00.000Z', '2026-08-31T14:00:00.000Z'),
      {
        id: 'b120',
        status: 'completed',
        startedAt: '2026-08-31T18:00:00.000Z',
        endedAt: '2026-08-31T18:30:00.000Z',
        breakTargetMinutes: 5,
      },
    ], windowStart, windowEnd);

    const over120 = computeBreakCompliance([
      completedSession('a121', '2026-08-31T16:00:00.000Z', '2026-08-31T14:00:00.000Z'),
      {
        id: 'b121',
        status: 'completed',
        startedAt: '2026-08-31T18:01:00.000Z',
        endedAt: '2026-08-31T18:30:00.000Z',
        breakTargetMinutes: 5,
      },
    ], windowStart, windowEnd);

    expect(exactly120.eligibleCount).toBe(1);
    expect(over120.eligibleCount).toBe(0);
  });

  it('does not create a break opportunity for an abandoned previous session', () => {
    const result = computeBreakCompliance([
      {
        id: 'abandoned',
        status: 'abandoned',
        startedAt: '2026-08-31T15:00:00.000Z',
        endedAt: '2026-08-31T15:10:00.000Z',
        breakTargetMinutes: 5,
      },
      completedSession('next', '2026-08-31T16:00:00.000Z', '2026-08-31T15:20:00.000Z'),
    ], windowStart, windowEnd);

    expect(result.eligibleCount).toBe(0);
    expect(result.percent).toBeNull();
  });

  it('counts a running next session within 120 minutes', () => {
    const sessions: FocusSessionForBreak[] = [
      {
        id: 'prev',
        status: 'completed',
        startedAt: '2026-08-31T04:30:00.000Z',
        endedAt: '2026-08-31T04:50:00.000Z',
        breakTargetMinutes: 5,
      },
      {
        id: 'next-running',
        status: 'running',
        startedAt: '2026-08-31T05:10:00.000Z',
        endedAt: null,
        breakTargetMinutes: 5,
      },
    ];

    const result = computeBreakCompliance(sessions, windowStart, windowEnd);

    expect(result.eligibleCount).toBe(1);
    expect(result.compliantCount).toBe(1);
    expect(result.percent).toBe(100);
  });

  it('counts a completed A to abandoned B pair when gap is eligible', () => {
    const result = computeBreakCompliance([
      completedSession('a', '2026-08-31T16:00:00.000Z', '2026-08-31T15:30:00.000Z'),
      {
        id: 'b',
        status: 'abandoned',
        startedAt: '2026-08-31T16:10:00.000Z',
        endedAt: '2026-08-31T16:12:00.000Z',
        breakTargetMinutes: 5,
      },
    ], windowStart, windowEnd);

    expect(result.eligibleCount).toBe(1);
    expect(result.compliantCount).toBe(1);
  });

  it('pairs only with the earliest next session', () => {
    const result = computeBreakCompliance([
      completedSession('a', '2026-08-31T16:00:00.000Z', '2026-08-31T15:30:00.000Z'),
      {
        id: 'earliest',
        status: 'abandoned',
        startedAt: '2026-08-31T16:03:00.000Z',
        endedAt: '2026-08-31T16:05:00.000Z',
        breakTargetMinutes: 5,
      },
      {
        id: 'later-completed',
        status: 'completed',
        startedAt: '2026-08-31T16:20:00.000Z',
        endedAt: '2026-08-31T16:40:00.000Z',
        breakTargetMinutes: 5,
      },
    ], windowStart, windowEnd);

    expect(result.eligibleCount).toBe(1);
    expect(result.compliantCount).toBe(0);
  });

  it('uses the stored break target snapshot instead of a later preference value', () => {
    const result = computeBreakCompliance([
      completedSession(
        'legacy',
        '2026-08-31T16:00:00.000Z',
        '2026-08-31T15:30:00.000Z',
        5,
      ),
      {
        id: 'next',
        status: 'completed',
        startedAt: '2026-08-31T16:08:00.000Z',
        endedAt: '2026-08-31T16:30:00.000Z',
        breakTargetMinutes: 15,
      },
    ], windowStart, windowEnd);

    expect(result.eligibleCount).toBe(1);
    expect(result.compliantCount).toBe(1);
  });
});

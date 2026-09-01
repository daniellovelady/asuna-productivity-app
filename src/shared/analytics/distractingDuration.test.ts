import { describe, expect, it } from 'vitest';
import {
  computeDistractingAppDurations,
  computeSampleIntervalSeconds,
  toEstimatedMinutes,
} from './distractingDuration';

describe('computeSampleIntervalSeconds', () => {
  it('credits distracting intervals until the next global observation', () => {
    const current = {
      id: '1',
      recordedAt: '2026-08-29T12:00:00.000Z',
      applicationName: 'youtube',
      classification: 'distracting' as const,
      idleSeconds: 0,
    };
    const next = {
      id: '2',
      recordedAt: '2026-08-29T12:00:15.000Z',
      applicationName: 'vscode',
      classification: 'productive' as const,
      idleSeconds: 0,
    };

    expect(computeSampleIntervalSeconds(current, next)).toBe(15);
  });

  it('caps individual intervals at 60 seconds', () => {
    const current = {
      id: '1',
      recordedAt: '2026-08-30T18:30:00.000Z',
      applicationName: 'twitch',
      classification: 'distracting' as const,
      idleSeconds: 0,
    };
    const next = {
      id: '2',
      recordedAt: '2026-08-30T18:32:30.000Z',
      applicationName: 'chrome',
      classification: 'neutral' as const,
      idleSeconds: 0,
    };

    expect(computeSampleIntervalSeconds(current, next)).toBe(60);
  });

  it('returns zero for idle distracting samples at the threshold', () => {
    const current = {
      id: '1',
      recordedAt: '2026-08-28T22:00:00.000Z',
      applicationName: 'youtube',
      classification: 'distracting' as const,
      idleSeconds: 180,
    };
    const next = {
      id: '2',
      recordedAt: '2026-08-28T22:01:00.000Z',
      applicationName: 'youtube',
      classification: 'distracting' as const,
      idleSeconds: 0,
    };

    expect(computeSampleIntervalSeconds(current, next)).toBe(0);
  });

  it('defensively clamps malformed negative intervals to zero', () => {
    const current = {
      id: '1',
      recordedAt: '2026-08-27T10:00:00.000Z',
      applicationName: 'skew',
      classification: 'distracting' as const,
      idleSeconds: 0,
    };
    const next = {
      id: '2',
      recordedAt: '2026-08-27T09:59:00.000Z',
      applicationName: 'skew',
      classification: 'distracting' as const,
      idleSeconds: 0,
    };

    expect(computeSampleIntervalSeconds(current, next)).toBe(0);
  });
});

describe('180-second idle boundary', () => {
  it('does not retroactively erase activity before the idle threshold', () => {
    const samples = [
      {
        id: 'a',
        recordedAt: '2026-08-31T10:00:00.000Z',
        applicationName: 'youtube',
        classification: 'distracting' as const,
        idleSeconds: 120,
      },
      {
        id: 'b',
        recordedAt: '2026-08-31T10:01:00.000Z',
        applicationName: 'youtube',
        classification: 'distracting' as const,
        idleSeconds: 180,
      },
      {
        id: 'c',
        recordedAt: '2026-08-31T10:02:00.000Z',
        applicationName: 'chrome',
        classification: 'neutral' as const,
        idleSeconds: 0,
      },
    ];

    expect(computeSampleIntervalSeconds(samples[0], samples[1])).toBe(60);
    expect(computeSampleIntervalSeconds(samples[1], samples[2])).toBe(0);

    const totals = computeDistractingAppDurations(samples);
    expect(totals).toEqual([{ applicationName: 'youtube', estimatedSeconds: 60 }]);
    expect(toEstimatedMinutes(60)).toBe(1);
  });
});

describe('computeDistractingAppDurations', () => {
  it('omits zero-duration distracting apps', () => {
    const totals = computeDistractingAppDurations([
      {
        id: 'only',
        recordedAt: '2026-08-31T20:00:00.000Z',
        applicationName: 'x',
        classification: 'distracting',
        idleSeconds: 0,
      },
    ]);

    expect(totals).toEqual([]);
  });
});

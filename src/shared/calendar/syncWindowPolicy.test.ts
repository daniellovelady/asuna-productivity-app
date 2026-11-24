import { describe, expect, it } from 'vitest';
import { isRollingFullSyncDue } from './syncWindowPolicy';

describe('isRollingFullSyncDue', () => {
  const timeZone = 'UTC';

  it('requires full sync when anchor is null', () => {
    expect(isRollingFullSyncDue({
      fullSyncWindowAnchorDate: null,
      lastFullSyncCompletedAtMs: null,
      nowMs: Date.parse('2026-10-02T12:00:00.000Z'),
      timeZone,
    })).toBe(true);
  });

  it('uses incremental on same-day periodic refresh within 24h', () => {
    const nowMs = Date.parse('2026-10-02T15:00:00.000Z');
    expect(isRollingFullSyncDue({
      fullSyncWindowAnchorDate: '2026-10-02',
      lastFullSyncCompletedAtMs: Date.parse('2026-10-02T10:00:00.000Z'),
      nowMs,
      timeZone,
    })).toBe(false);
  });

  it('requires full sync when anchor is a previous local calendar day', () => {
    expect(isRollingFullSyncDue({
      fullSyncWindowAnchorDate: '2026-10-01',
      lastFullSyncCompletedAtMs: Date.parse('2026-10-01T23:00:00.000Z'),
      nowMs: Date.parse('2026-10-02T01:00:00.000Z'),
      timeZone,
    })).toBe(true);
  });

  it('requires full sync after 24 hours on the same anchor day', () => {
    const anchorMs = Date.parse('2026-10-02T08:00:00.000Z');
    expect(isRollingFullSyncDue({
      fullSyncWindowAnchorDate: '2026-10-02',
      lastFullSyncCompletedAtMs: anchorMs,
      nowMs: anchorMs + 25 * 60 * 60 * 1000,
      timeZone,
    })).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { createEmptyCache } from './calendarCacheStore';
import { shouldUseFullSyncForCalendar } from './calendarSyncEngine';
import { resolveFullSyncWindowAnchor } from '../../shared/calendar/syncWindowPolicy';

describe('calendarSyncEngine rolling window', () => {
  it('stores initial full window anchor after full sync metadata update', () => {
    const nowMs = Date.parse('2026-10-02T12:00:00.000Z');
    const cache = createEmptyCache('UTC');
    cache.fullSyncWindowAnchorDate = resolveFullSyncWindowAnchor(nowMs, 'UTC');
    cache.lastFullSyncCompletedAtMs = nowMs;
    cache.calendars.primary = { nextSyncToken: 'token-1', events: {} };

    expect(cache.fullSyncWindowAnchorDate).toBe('2026-10-02');
    expect(shouldUseFullSyncForCalendar(cache, 'primary', nowMs + 60_000)).toBe(false);
  });

  it('uses incremental on same-day refresh within 24h', () => {
    const nowMs = Date.parse('2026-10-02T15:00:00.000Z');
    const cache = createEmptyCache('UTC');
    cache.fullSyncWindowAnchorDate = '2026-10-02';
    cache.lastFullSyncCompletedAtMs = Date.parse('2026-10-02T10:00:00.000Z');
    cache.calendars.primary = { nextSyncToken: 'token-1', events: {} };

    expect(shouldUseFullSyncForCalendar(cache, 'primary', nowMs)).toBe(false);
  });

  it('requires bounded full sync on next local calendar day', () => {
    const nowMs = Date.parse('2026-10-03T01:00:00.000Z');
    const cache = createEmptyCache('UTC');
    cache.fullSyncWindowAnchorDate = '2026-10-02';
    cache.lastFullSyncCompletedAtMs = Date.parse('2026-10-02T10:00:00.000Z');
    cache.calendars.primary = { nextSyncToken: 'token-1', events: {} };

    expect(shouldUseFullSyncForCalendar(cache, 'primary', nowMs)).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarCachePayload } from './calendarCacheStore';
import { resetAuthContextSnapshotForTests, applyAuthContextSnapshot } from '../auth/authContextSnapshot';

const GENERATION = 1;

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock('./calendarTokenStore', () => ({
  hasStoredTokens: vi.fn(() => true),
  loadTokens: vi.fn(() => ({ connectedAt: '2026-01-01T00:00:00.000Z' })),
  deleteTokens: vi.fn(),
}));

vi.mock('./calendarCacheStore', async () => {
  const actual = await vi.importActual<typeof import('./calendarCacheStore')>('./calendarCacheStore');
  return {
    ...actual,
    loadCacheFromDisk: vi.fn(),
    saveCacheToDisk: vi.fn(),
    deleteCacheFromDisk: vi.fn(),
  };
});

vi.mock('./googleOAuthService', () => ({
  getValidAccessToken: vi.fn(async () => 'access-token'),
  hasStoredTokens: vi.fn(() => true),
  revokeAndDeleteTokens: vi.fn(),
  runGoogleConnectFlow: vi.fn(),
}));

vi.mock('./calendarSyncEngine', () => ({
  fetchAllCalendarListEntries: vi.fn(async () => []),
  syncCalendarEvents: vi.fn(async () => undefined),
  isRollingFullSyncDueForCache: () => false,
  CalendarSyncError: class CalendarSyncError extends Error {},
}));

import { getCalendarService, resetCalendarServiceForTests } from './calendarService';
import { loadCacheFromDisk } from './calendarCacheStore';

function buildCache(): CalendarCachePayload {
  return {
    calendarList: [{ id: 'cal', provider: 'google', name: 'Work', primary: true }],
    calendars: {
      cal: {
        nextSyncToken: null,
        events: {
          evt1: {
            externalEventId: 'evt1',
            calendarId: 'cal',
            calendarName: 'Work',
            title: 'Evening',
            startAt: '2026-03-08T01:00:00.000Z',
            endAt: '2026-03-08T02:00:00.000Z',
            allDay: false,
            location: null,
            status: 'confirmed',
            provider: 'google',
            lastSyncedAt: '2026-01-01T00:00:00.000Z',
            linkedTaskId: null,
            mirrorScheduleBlockId: null,
          },
        },
      },
    },
    lastSyncedAt: '2026-01-01T00:00:00.000Z',
    fullSyncWindowAnchorDate: '2026-03-07',
    lastFullSyncCompletedAtMs: Date.now(),
    timeZone: 'UTC',
  };
}

describe('CalendarService timezone plumbing', () => {
  beforeEach(() => {
    resetAuthContextSnapshotForTests();
    resetCalendarServiceForTests();
    vi.mocked(loadCacheFromDisk).mockReturnValue(buildCache());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T00:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetCalendarServiceForTests();
    resetAuthContextSnapshotForTests();
  });

  it('groups agenda today/upcoming using auth snapshot timezone', async () => {
    const service = getCalendarService();
    applyAuthContextSnapshot('user-1', 1, GENERATION, 'America/Chicago');
    await service.handleAuthContextChange('user-1');

    const state = service.getPublicState();
    expect(state.agenda?.today).toHaveLength(1);
    expect(state.agenda?.today[0]?.title).toBe('Evening');
    expect(state.agenda?.upcoming).toHaveLength(0);
  });

  it('uses UTC when auth user does not match active calendar user', async () => {
    const service = getCalendarService();
    applyAuthContextSnapshot('user-1', 1, GENERATION, 'America/Chicago');
    await service.handleAuthContextChange('user-2');

    const state = service.getPublicState();
    expect(state.agenda?.today).toHaveLength(1);
    expect(state.agenda?.upcoming).toHaveLength(0);
  });

  it('re-emits agenda when timezone updates for same user', async () => {
    const service = getCalendarService();
    applyAuthContextSnapshot('user-1', 1, GENERATION, 'UTC');
    await service.handleAuthContextChange('user-1');

    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);
    listener.mockClear();

    applyAuthContextSnapshot('user-1', 2, GENERATION, 'America/Chicago');
    await service.handleAuthContextChange('user-1');

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });
});
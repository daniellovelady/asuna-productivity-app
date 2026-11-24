import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyCache } from './calendarCacheStore';
import { GOOGLE_CALENDAR_REAUTH_USER_MESSAGE, GoogleTokenRefreshError } from './googleOAuthErrors';
import { resetCalendarServiceForTests, getCalendarService } from './calendarService';
import { applyAuthContextSnapshot, registerRendererGeneration, resetAuthContextSnapshotForTests } from '../auth/authContextSnapshot';

const USER_ID = 'user-calendar-reauth';

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

const deleteTokens = vi.fn();
let tokensPresent = true;

vi.mock('./calendarTokenStore', () => ({
  deleteTokens: (userId: string) => deleteTokens(userId),
  loadTokens: () => (tokensPresent ? { refreshToken: 'r', accessToken: 'a', expiryDateMs: Date.now() + 3600_000, connectedAt: '2026-01-01T00:00:00.000Z' } : null),
}));

vi.mock('./googleOAuthService', () => ({
  getValidAccessToken: vi.fn(async () => {
    throw new GoogleTokenRefreshError('invalid_grant', 'invalid_grant');
  }),
  hasStoredTokens: () => tokensPresent,
  revokeAndDeleteTokens: vi.fn(),
  runGoogleConnectFlow: vi.fn(),
}));

const now = Date.now();
const startAt = new Date(now + 60 * 60 * 1000).toISOString();
const endAt = new Date(now + 90 * 60 * 1000).toISOString();

const sampleCache = createEmptyCache('UTC');
sampleCache.lastSyncedAt = new Date(now).toISOString();
sampleCache.calendars.cal1 = {
  nextSyncToken: null,
  events: {
    evt1: {
      calendarId: 'cal1',
      externalEventId: 'evt1',
      calendarName: 'Primary',
      title: 'Standup',
      status: 'confirmed',
      startAt,
      endAt,
      allDay: false,
      location: null,
      provider: 'google',
      lastSyncedAt: sampleCache.lastSyncedAt,
      linkedTaskId: null,
      mirrorScheduleBlockId: null,
    },
  },
};

vi.mock('./calendarCacheStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./calendarCacheStore')>();
  return {
    ...actual,
    loadCacheFromDisk: () => sampleCache,
    saveCacheToDisk: vi.fn(),
    deleteCacheFromDisk: vi.fn(),
  };
});

vi.mock('./calendarSyncEngine', () => ({
  fetchAllCalendarListEntries: vi.fn(),
  syncCalendarEvents: vi.fn(),
  isRollingFullSyncDueForCache: () => false,
  CalendarSyncError: class CalendarSyncError extends Error {},
}));

describe('CalendarService reauth_required', () => {
  beforeEach(() => {
    resetAuthContextSnapshotForTests();
    resetCalendarServiceForTests();
    tokensPresent = true;
    deleteTokens.mockClear();
    registerRendererGeneration(1);
    applyAuthContextSnapshot(USER_ID, 1, 1, 'UTC');
  });

  afterEach(() => {
    resetCalendarServiceForTests();
    resetAuthContextSnapshotForTests();
  });

  it('preserves agenda cache, deletes tokens, and surfaces reauth after invalid_grant', async () => {
    const service = getCalendarService();
    service.handleAuthContextChange(USER_ID);

    await vi.waitUntil(() => service.getPublicState().account.status === 'reauth_required', {
      timeout: 2000,
    });

    const state = service.getPublicState();
    expect(deleteTokens).toHaveBeenCalledWith(USER_ID);
    expect(state.account.status).toBe('reauth_required');
    expect(state.account.syncError).toBe(GOOGLE_CALENDAR_REAUTH_USER_MESSAGE);
    expect(state.account.syncError).not.toMatch(/invalid_grant/i);
    expect(state.agenda).not.toBeNull();
    expect(state.agenda?.today.length + state.agenda?.upcoming.length).toBeGreaterThan(0);
  });
});
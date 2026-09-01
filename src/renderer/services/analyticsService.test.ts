import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AnalyticsServiceError,
  createAnalyticsService,
  mapAnalyticsSnapshot,
} from './analyticsService';

function createMockClient(): SupabaseClient {
  return {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  } as unknown as SupabaseClient;
}

const validSnapshot = {
  range: {
    start: '2026-08-25',
    end: '2026-08-31',
    timezone: 'America/Chicago',
  },
  focusTodayMinutes: 98,
  totalFocusMinutes: 393,
  completedSessions: 11,
  interruptionCount: 7,
  averageSessionMinutes: 27.1538461538,
  breakCompliancePercent: 60,
  focusByDay: [{ date: '2026-08-25', focusMinutes: 40 }],
  focusByTask: [{ taskLabel: 'Capstone', focusMinutes: 160 }],
  topDistractingApps: [{ applicationName: 'youtube', estimatedMinutes: 2.5 }],
};

describe('mapAnalyticsSnapshot', () => {
  it('maps a valid RPC payload', () => {
    expect(mapAnalyticsSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  it('rejects malformed payloads', () => {
    expect(() => mapAnalyticsSnapshot({})).toThrow(AnalyticsServiceError);
  });
});

describe('createAnalyticsService', () => {
  it('fetches and maps the analytics snapshot', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    } as never);
    vi.mocked(client.rpc).mockResolvedValue({
      data: validSnapshot,
      error: null,
    } as never);

    const service = createAnalyticsService(client);
    await expect(service.fetchSnapshot()).resolves.toEqual(validSnapshot);
    expect(client.rpc).toHaveBeenCalledWith('get_analytics_snapshot');
  });

  it('requires authentication', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);

    const service = createAnalyticsService(client);
    await expect(service.fetchSnapshot()).rejects.toThrow(AnalyticsServiceError);
  });
});

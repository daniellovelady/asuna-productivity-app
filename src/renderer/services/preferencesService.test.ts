import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getTrackingEnabledPreference,
  setTrackingEnabledPreference,
} from './preferencesService';

function createMockClient(userId: string, trackingEnabled: boolean) {
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { tracking_enabled: trackingEnabled },
            error: null,
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  } as unknown as SupabaseClient;

  return client;
}

describe('preferencesService', () => {
  it('loads tracking_enabled without starting runtime sampling', async () => {
    const client = createMockClient('user-1', true);
    await expect(getTrackingEnabledPreference(client)).resolves.toBe(true);
  });

  it('updates tracking_enabled on explicit preference write', async () => {
    const client = createMockClient('user-1', false);
    await expect(setTrackingEnabledPreference(client, true)).resolves.toBeUndefined();
  });
});

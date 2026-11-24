import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getPreferences,
  getTrackingEnabledPreference,
  setTrackingEnabledPreference,
} from './preferencesService';

function createMockClient(userId: string, row: Record<string, unknown>) {
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: row,
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

const baseRow = {
  focus_minutes: 25,
  break_minutes: 5,
  tracking_enabled: true,
  distraction_threshold_minutes: 5,
  encouragement_level: 'medium',
  avatar_style: 'default',
  quiet_mode: false,
  reminder_tone: 'neutral',
  ai_message_variation_enabled: false,
};

describe('preferencesService', () => {
  it('loads tracking_enabled without starting runtime sampling', async () => {
    const client = createMockClient('user-1', baseRow);
    await expect(getTrackingEnabledPreference(client)).resolves.toBe(true);
  });

  it('loads full preferences row', async () => {
    const client = createMockClient('user-1', baseRow);
    const preferences = await getPreferences(client);
    expect(preferences.focusMinutes).toBe(25);
    expect(preferences.trackingEnabled).toBe(true);
    expect(preferences.aiMessageVariationEnabled).toBe(false);
  });

  it('updates tracking_enabled on explicit preference write', async () => {
    const client = createMockClient('user-1', { ...baseRow, tracking_enabled: false });
    await expect(setTrackingEnabledPreference(client, true)).resolves.toBeUndefined();
  });
});

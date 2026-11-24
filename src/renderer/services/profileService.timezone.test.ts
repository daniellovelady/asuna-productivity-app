import { afterEach, describe, expect, it, vi } from 'vitest';

const supabaseFrom = vi.hoisted(() => vi.fn());

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: supabaseFrom,
  },
}));

import { backfillProfileTimeZoneFromOs } from './profileService';

function mockSelectTimezone(value: string | null) {
  supabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: value === null ? null : { timezone: value },
          error: null,
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
}

describe('backfillProfileTimeZoneFromOs', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('updates placeholder UTC to OS timezone', async () => {
    mockSelectTimezone('UTC');
    const result = await backfillProfileTimeZoneFromOs('user-1', 'America/Chicago');
    expect(result).toBe('America/Chicago');
    expect(supabaseFrom).toHaveBeenCalledWith('profiles');
  });

  it('does not overwrite explicit profile timezone', async () => {
    mockSelectTimezone('Pacific/Honolulu');
    const result = await backfillProfileTimeZoneFromOs('user-1', 'America/Chicago');
    expect(result).toBeNull();
  });
});
import { afterEach, describe, expect, it, vi } from 'vitest';

const { fetchProfileTimeZone, backfillProfileTimeZoneFromOs } = vi.hoisted(() => ({
  fetchProfileTimeZone: vi.fn(),
  backfillProfileTimeZoneFromOs: vi.fn(),
}));

vi.mock('./profileService', () => ({
  fetchProfileTimeZone,
  backfillProfileTimeZoneFromOs,
}));

import { resolveAuthContextTimeZone } from './authContextTimeZone';
import * as userTimezone from '../../shared/timezone/userTimezone';

afterEach(() => {
  fetchProfileTimeZone.mockReset();
  backfillProfileTimeZoneFromOs.mockReset();
  vi.restoreAllMocks();
});

describe('resolveAuthContextTimeZone', () => {
  it('returns UTC on sign-out', async () => {
    await expect(resolveAuthContextTimeZone(null)).resolves.toBe('UTC');
    expect(fetchProfileTimeZone).not.toHaveBeenCalled();
  });

  it('uses profile timezone when valid', async () => {
    fetchProfileTimeZone.mockResolvedValue('America/Chicago');
    backfillProfileTimeZoneFromOs.mockResolvedValue(null);
    vi.spyOn(userTimezone, 'resolveOsTimeZone').mockReturnValue('Europe/Berlin');

    await expect(resolveAuthContextTimeZone('user-1')).resolves.toBe('America/Chicago');
  });

  it('uses OS timezone when profile is placeholder UTC', async () => {
    fetchProfileTimeZone.mockResolvedValue('UTC');
    backfillProfileTimeZoneFromOs.mockResolvedValue(null);
    vi.spyOn(userTimezone, 'resolveOsTimeZone').mockReturnValue('America/Chicago');

    await expect(resolveAuthContextTimeZone('user-1')).resolves.toBe('America/Chicago');
  });

  it('uses backfilled profile after repair', async () => {
    fetchProfileTimeZone.mockResolvedValue('UTC');
    backfillProfileTimeZoneFromOs.mockResolvedValue('America/Chicago');
    vi.spyOn(userTimezone, 'resolveOsTimeZone').mockReturnValue('America/Chicago');

    await expect(resolveAuthContextTimeZone('user-1')).resolves.toBe('America/Chicago');
  });

  it('isolates per-user fetch', async () => {
    fetchProfileTimeZone.mockResolvedValue('Pacific/Auckland');
    backfillProfileTimeZoneFromOs.mockResolvedValue(null);
    await resolveAuthContextTimeZone('user-a');
    expect(fetchProfileTimeZone).toHaveBeenCalledWith('user-a');
  });
});
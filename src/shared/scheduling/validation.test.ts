import { describe, expect, it } from 'vitest';
import { isValidScheduleBlockTimeRange } from './validation';

describe('isValidScheduleBlockTimeRange', () => {
  it('accepts end after start', () => {
    expect(
      isValidScheduleBlockTimeRange(
        '2026-03-10T14:00:00.000Z',
        '2026-03-10T15:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('rejects equal instants', () => {
    expect(
      isValidScheduleBlockTimeRange(
        '2026-03-10T14:00:00.000Z',
        '2026-03-10T14:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('rejects end before start', () => {
    expect(
      isValidScheduleBlockTimeRange(
        '2026-03-10T15:00:00.000Z',
        '2026-03-10T14:00:00.000Z',
      ),
    ).toBe(false);
  });
});
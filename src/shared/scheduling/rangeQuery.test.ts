import { describe, expect, it } from 'vitest';
import { scheduleBlockIntersectsRange } from './rangeQuery';

describe('scheduleBlockIntersectsRange', () => {
  const block = {
    scheduledStartAt: '2026-03-10T14:00:00.000Z',
    scheduledEndAt: '2026-03-10T16:00:00.000Z',
  };

  it('intersects when range overlaps block', () => {
    expect(
      scheduleBlockIntersectsRange(
        block,
        '2026-03-10T15:00:00.000Z',
        '2026-03-10T18:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('intersects when range fully contains block', () => {
    expect(
      scheduleBlockIntersectsRange(
        block,
        '2026-03-10T10:00:00.000Z',
        '2026-03-10T20:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('does not intersect when range ends at block start', () => {
    expect(
      scheduleBlockIntersectsRange(
        block,
        '2026-03-10T10:00:00.000Z',
        '2026-03-10T14:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('does not intersect when range starts at block end', () => {
    expect(
      scheduleBlockIntersectsRange(
        block,
        '2026-03-10T16:00:00.000Z',
        '2026-03-10T18:00:00.000Z',
      ),
    ).toBe(false);
  });
});
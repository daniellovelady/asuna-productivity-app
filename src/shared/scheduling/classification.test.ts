import { describe, expect, it } from 'vitest';
import {
  classifyTaskSchedulingMembership,
  isActiveScheduleBlock,
} from './classification';

const NOW = new Date('2026-03-10T15:30:00.000Z').getTime();

function block(
  start: string,
  end: string,
  status: 'scheduled' | 'cancelled' = 'scheduled',
) {
  return {
    status,
    scheduledEndAt: end,
    scheduledStartAt: start,
  };
}

describe('isActiveScheduleBlock', () => {
  it('treats current block as active when end is in the future', () => {
    expect(isActiveScheduleBlock(block('2026-03-10T14:00:00.000Z', '2026-03-10T16:00:00.000Z'), NOW))
      .toBe(true);
  });

  it('treats past block as inactive', () => {
    expect(isActiveScheduleBlock(block('2026-03-10T10:00:00.000Z', '2026-03-10T11:00:00.000Z'), NOW))
      .toBe(false);
  });

  it('ignores cancelled blocks', () => {
    expect(
      isActiveScheduleBlock(
        block('2026-03-10T16:00:00.000Z', '2026-03-10T17:00:00.000Z', 'cancelled'),
        NOW,
      ),
    ).toBe(false);
  });
});

describe('classifyTaskSchedulingMembership', () => {
  it('returns unscheduled when active task has no blocks', () => {
    expect(classifyTaskSchedulingMembership('pending', [], NOW)).toBe('unscheduled');
  });

  it('returns scheduled when future block exists', () => {
    const blocks = [block('2026-03-10T18:00:00.000Z', '2026-03-10T19:00:00.000Z')];
    expect(classifyTaskSchedulingMembership('in_progress', blocks, NOW)).toBe('scheduled');
  });

  it('returns unscheduled when only past blocks exist', () => {
    const blocks = [block('2026-03-10T10:00:00.000Z', '2026-03-10T11:00:00.000Z')];
    expect(classifyTaskSchedulingMembership('pending', blocks, NOW)).toBe('unscheduled');
  });

  it('returns unscheduled when only cancelled future blocks exist', () => {
    const blocks = [block('2026-03-10T18:00:00.000Z', '2026-03-10T19:00:00.000Z', 'cancelled')];
    expect(classifyTaskSchedulingMembership('pending', blocks, NOW)).toBe('unscheduled');
  });

  it('returns scheduled when any active block among many', () => {
    const blocks = [
      block('2026-03-10T10:00:00.000Z', '2026-03-10T11:00:00.000Z'),
      block('2026-03-10T18:00:00.000Z', '2026-03-10T19:00:00.000Z'),
    ];
    expect(classifyTaskSchedulingMembership('in_progress', blocks, NOW)).toBe('scheduled');
  });

  it('returns null for completed tasks', () => {
    expect(classifyTaskSchedulingMembership('completed', [], NOW)).toBeNull();
  });
});
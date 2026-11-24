import { describe, expect, it } from 'vitest';
import { groupTasksForDrawer } from './taskScheduleDrawerModel';
import type { Task } from '../../types/task';
import type { ScheduleBlock } from '../../../shared/scheduling/types';

const NOW = new Date('2026-03-10T15:00:00.000Z').getTime();

const baseTask = (overrides: Partial<Task>): Task => ({
  id: 'task-1',
  title: 'Alpha',
  description: null,
  status: 'pending',
  priority: 'medium',
  createdAt: '2026-03-01T00:00:00.000Z',
  completedAt: null,
  updatedAt: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

const block = (overrides: Partial<ScheduleBlock>): ScheduleBlock => ({
  id: 'block-1',
  userId: 'u',
  taskId: 'task-1',
  taskTitleSnapshot: 'Alpha',
  scheduledStartAt: '2026-03-10T16:00:00.000Z',
  scheduledEndAt: '2026-03-10T17:00:00.000Z',
  timezone: 'UTC',
  status: 'scheduled',
  cancelReason: null,
  cancelledAt: null,
  googleCalendarId: null,
  googleEventId: null,
  googleSyncState: 'synced',
  googleSyncError: null,
  googleSyncNextRetryAt: null,
  googleLastSyncedAt: null,
  createdAt: '2026-03-09T00:00:00.000Z',
  updatedAt: '2026-03-09T00:00:00.000Z',
  ...overrides,
});

describe('groupTasksForDrawer', () => {
  it('classifies unscheduled vs scheduled tasks', () => {
    const tasks = [
      baseTask({ id: 't1', title: 'No blocks' }),
      baseTask({ id: 't2', title: 'Has block' }),
    ];
    const blocks = [block({ taskId: 't2' })];

    const grouped = groupTasksForDrawer(tasks, blocks, NOW, '');
    expect(grouped.unscheduled.map((t) => t.id)).toEqual(['t1']);
    expect(grouped.scheduled.map((t) => t.id)).toEqual(['t2']);
  });

  it('filters by search', () => {
    const tasks = [
      baseTask({ id: 't1', title: 'Alpha' }),
      baseTask({ id: 't2', title: 'Beta' }),
    ];
    const grouped = groupTasksForDrawer(tasks, [], NOW, 'alp');
    expect(grouped.unscheduled).toHaveLength(1);
    expect(grouped.unscheduled[0]?.title).toBe('Alpha');
  });
});
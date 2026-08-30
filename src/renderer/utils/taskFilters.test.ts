import { describe, expect, it } from 'vitest';
import type { Task } from '../types/task';
import {
  filterActiveTasks,
  filterCompletedTasks,
  pickDefaultActiveTaskId,
  resolveActiveSelection,
} from './taskFilters';

function createTask(overrides: Partial<Task> & Pick<Task, 'id' | 'status'>): Task {
  return {
    title: 'Task',
    description: null,
    priority: 'medium',
    createdAt: '2026-08-27T09:00:00.000Z',
    completedAt: null,
    updatedAt: '2026-08-27T09:00:00.000Z',
    ...overrides,
  };
}

describe('filterActiveTasks', () => {
  it('includes pending and in_progress tasks sorted by createdAt newest first', () => {
    const tasks = [
      createTask({ id: 'older', status: 'pending', createdAt: '2026-08-27T09:00:00.000Z' }),
      createTask({ id: 'completed', status: 'completed', completedAt: '2026-08-28T09:00:00.000Z' }),
      createTask({ id: 'newer', status: 'in_progress', createdAt: '2026-08-29T09:00:00.000Z' }),
      createTask({ id: 'archived', status: 'archived' }),
    ];

    expect(filterActiveTasks(tasks).map((task) => task.id)).toEqual(['newer', 'older']);
  });
});

describe('filterCompletedTasks', () => {
  it('includes only completed tasks', () => {
    const tasks = [
      createTask({ id: 'pending', status: 'pending' }),
      createTask({ id: 'completed', status: 'completed', completedAt: '2026-08-28T09:00:00.000Z' }),
      createTask({ id: 'archived', status: 'archived' }),
    ];

    expect(filterCompletedTasks(tasks).map((task) => task.id)).toEqual(['completed']);
  });

  it('sorts by completedAt newest first', () => {
    const tasks = [
      createTask({ id: 'older', status: 'completed', completedAt: '2026-08-27T09:00:00.000Z' }),
      createTask({ id: 'newer', status: 'completed', completedAt: '2026-08-29T09:00:00.000Z' }),
      createTask({ id: 'middle', status: 'completed', completedAt: '2026-08-28T09:00:00.000Z' }),
    ];

    expect(filterCompletedTasks(tasks).map((task) => task.id)).toEqual(['newer', 'middle', 'older']);
  });

  it('places tasks with missing completedAt after those with valid timestamps', () => {
    const tasks = [
      createTask({ id: 'missing', status: 'completed', completedAt: null }),
      createTask({ id: 'dated', status: 'completed', completedAt: '2026-08-28T09:00:00.000Z' }),
    ];

    expect(filterCompletedTasks(tasks).map((task) => task.id)).toEqual(['dated', 'missing']);
  });

  it('does not mutate the original tasks array', () => {
    const tasks = [
      createTask({ id: 'older', status: 'completed', completedAt: '2026-08-27T09:00:00.000Z' }),
      createTask({ id: 'newer', status: 'completed', completedAt: '2026-08-29T09:00:00.000Z' }),
    ];
    const originalOrder = tasks.map((task) => task.id);

    filterCompletedTasks(tasks);

    expect(tasks.map((task) => task.id)).toEqual(originalOrder);
  });
});

describe('pickDefaultActiveTaskId', () => {
  it('returns the first active task id', () => {
    const tasks = [
      createTask({ id: 'completed', status: 'completed', completedAt: '2026-08-28T09:00:00.000Z' }),
      createTask({ id: 'active', status: 'pending' }),
    ];

    expect(pickDefaultActiveTaskId(tasks)).toBe('active');
  });

  it('never returns a completed task id', () => {
    const tasks = [
      createTask({ id: 'completed', status: 'completed', completedAt: '2026-08-28T09:00:00.000Z' }),
    ];

    expect(pickDefaultActiveTaskId(tasks)).toBeNull();
  });
});

describe('resolveActiveSelection', () => {
  const tasks = [
    createTask({ id: 'active-1', status: 'pending' }),
    createTask({ id: 'active-2', status: 'in_progress' }),
    createTask({ id: 'completed', status: 'completed', completedAt: '2026-08-28T09:00:00.000Z' }),
  ];

  it('keeps the selected id when the task is active', () => {
    expect(resolveActiveSelection(tasks, 'active-2')).toBe('active-2');
  });

  it('replaces selection when the selected task is completed', () => {
    expect(resolveActiveSelection(tasks, 'completed')).toBe('active-1');
  });

  it('returns null when no active tasks remain', () => {
    const completedOnly = [
      createTask({ id: 'completed', status: 'completed', completedAt: '2026-08-28T09:00:00.000Z' }),
    ];

    expect(resolveActiveSelection(completedOnly, 'completed')).toBeNull();
  });
});

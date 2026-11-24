import {
  classifyTaskSchedulingMembership,
  isActiveScheduleBlock,
} from '../../../shared/scheduling/classification';
import type { ScheduleBlock } from '../../../shared/scheduling/types';
import type { Task, TaskPriority } from '../../types/task';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortTasksForDrawer(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function filterTasksBySearch(tasks: readonly Task[], query: string): Task[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [...tasks];
  }

  return tasks.filter((task) => task.title.toLowerCase().includes(trimmed));
}

export function groupTasksForDrawer(
  tasks: readonly Task[],
  blocks: readonly ScheduleBlock[],
  nowMs: number,
  searchQuery: string,
): { unscheduled: Task[]; scheduled: Task[] } {
  const filtered = filterTasksBySearch(sortTasksForDrawer(tasks), searchQuery);
  const blocksByTaskId = new Map<string, ScheduleBlock[]>();

  for (const block of blocks) {
    if (!block.taskId) {
      continue;
    }
    const list = blocksByTaskId.get(block.taskId) ?? [];
    list.push(block);
    blocksByTaskId.set(block.taskId, list);
  }

  const unscheduled: Task[] = [];
  const scheduled: Task[] = [];

  for (const task of filtered) {
    const taskBlocks = blocksByTaskId.get(task.id) ?? [];
    const membership = classifyTaskSchedulingMembership(task.status, taskBlocks, nowMs);
    if (membership === 'unscheduled') {
      unscheduled.push(task);
    } else if (membership === 'scheduled') {
      scheduled.push(task);
    }
  }

  return { unscheduled, scheduled };
}

export function countActiveBlocksForTask(
  taskId: string,
  blocks: readonly ScheduleBlock[],
  nowMs: number,
): number {
  return blocks.filter(
    (block) => block.taskId === taskId && isActiveScheduleBlock(block, nowMs),
  ).length;
}
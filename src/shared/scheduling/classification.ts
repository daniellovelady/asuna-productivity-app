import type { TaskStatus } from '../tasks/types';
import type { ScheduleBlock } from './types';

export type TaskSchedulingDrawerMembership = 'unscheduled' | 'scheduled';

type BlockSchedulingFields = Pick<ScheduleBlock, 'status' | 'scheduledEndAt'>;

export function isActiveTaskStatus(status: TaskStatus): boolean {
  return status === 'pending' || status === 'in_progress';
}

export function isActiveScheduleBlock(
  block: BlockSchedulingFields,
  nowMs: number,
): boolean {
  if (block.status !== 'scheduled') {
    return false;
  }

  return new Date(block.scheduledEndAt).getTime() > nowMs;
}

export function classifyTaskSchedulingMembership(
  taskStatus: TaskStatus,
  blocks: readonly BlockSchedulingFields[],
  nowMs: number,
): TaskSchedulingDrawerMembership | null {
  if (!isActiveTaskStatus(taskStatus)) {
    return null;
  }

  const hasActiveBlock = blocks.some((block) => isActiveScheduleBlock(block, nowMs));
  return hasActiveBlock ? 'scheduled' : 'unscheduled';
}
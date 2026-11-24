import type { ScheduleBlock } from './types';

type LifecycleBlock = Pick<
  ScheduleBlock,
  'status' | 'scheduledStartAt' | 'scheduledEndAt'
>;

/** Mirrors complete_task_and_cancel_future_blocks cancellation predicate. */
export function shouldCancelBlockOnTaskComplete(
  block: LifecycleBlock,
  nowMs: number,
): boolean {
  if (block.status !== 'scheduled') {
    return false;
  }

  return new Date(block.scheduledStartAt).getTime() > nowMs;
}

/** Mirrors delete_task_with_schedule_block_cleanup cancellation predicate. */
export function shouldCancelBlockOnTaskDelete(
  block: LifecycleBlock,
  nowMs: number,
): boolean {
  if (block.status !== 'scheduled') {
    return false;
  }

  return new Date(block.scheduledEndAt).getTime() > nowMs;
}
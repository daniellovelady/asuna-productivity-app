import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  createScheduleBlockService,
  ScheduleBlockServiceError,
} from './scheduleBlockService';
import type { ScheduleBlockRow } from '../../shared/scheduling/types';

const blockRow: ScheduleBlockRow = {
  id: 'block-1',
  user_id: 'user-1',
  task_id: 'task-1',
  task_title_snapshot: 'Trusted title',
  scheduled_start_at: '2026-03-10T15:00:00.000Z',
  scheduled_end_at: '2026-03-10T16:00:00.000Z',
  timezone: 'America/Chicago',
  status: 'scheduled',
  cancel_reason: null,
  cancelled_at: null,
  google_calendar_id: null,
  google_event_id: null,
  google_sync_state: 'synced',
  google_sync_error: null,
  google_sync_next_retry_at: null,
  google_last_synced_at: null,
  created_at: '2026-03-09T12:00:00.000Z',
  updated_at: '2026-03-09T12:00:00.000Z',
};

function createMockClient(): SupabaseClient {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn(),
    single: vi.fn(),
  };

  return {
    from: vi.fn(() => chain),
    auth: {
      getUser: vi.fn(),
    },
    _chain: chain,
  } as unknown as SupabaseClient & { _chain: typeof chain };
}

describe('scheduleBlockService', () => {
  it('create does not send task_title_snapshot', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } as User },
      error: null,
    });
    client._chain.single.mockResolvedValue({ data: blockRow, error: null });

    const service = createScheduleBlockService(client);
    const block = await service.createScheduleBlock({
      taskId: 'task-1',
      scheduledStartAt: '2026-03-10T15:00:00.000Z',
      scheduledEndAt: '2026-03-10T16:00:00.000Z',
      timezone: 'America/Chicago',
    });

    const insertPayload = vi.mocked(client._chain.insert).mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.task_title_snapshot).toBeUndefined();
    expect(insertPayload.task_id).toBe('task-1');
    expect(block.taskTitleSnapshot).toBe('Trusted title');
  });

  it('rejects invalid time range before insert', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } as User },
      error: null,
    });

    const service = createScheduleBlockService(client);

    await expect(
      service.createScheduleBlock({
        taskId: 'task-1',
        scheduledStartAt: '2026-03-10T16:00:00.000Z',
        scheduledEndAt: '2026-03-10T15:00:00.000Z',
        timezone: 'America/Chicago',
      }),
    ).rejects.toBeInstanceOf(ScheduleBlockServiceError);
  });

  it('cancels on same row', async () => {
    const client = createMockClient();
    client._chain.single.mockResolvedValue({
      data: {
        ...blockRow,
        status: 'cancelled',
        cancel_reason: 'user_unscheduled',
        cancelled_at: '2026-03-10T12:00:00.000Z',
      },
      error: null,
    });

    const service = createScheduleBlockService(client);
    await service.cancelScheduleBlock('block-1', blockRow.updated_at);

    expect(client._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        cancel_reason: 'user_unscheduled',
      }),
    );
  });

  it('restores same row', async () => {
    const client = createMockClient();
    client._chain.single.mockResolvedValue({ data: blockRow, error: null });

    const service = createScheduleBlockService(client);
    await service.restoreScheduleBlock('block-1', blockRow.updated_at);

    expect(client._chain.update).toHaveBeenCalledWith({
      status: 'scheduled',
      cancel_reason: null,
      cancelled_at: null,
    });
  });

  it('lists with range intersection filters', async () => {
    const client = createMockClient();
    client._chain.order.mockResolvedValue({ data: [blockRow], error: null });

    const service = createScheduleBlockService(client);
    const blocks = await service.listScheduleBlocks({
      rangeStart: '2026-03-10T00:00:00.000Z',
      rangeEnd: '2026-03-11T00:00:00.000Z',
    });

    expect(client._chain.lt).toHaveBeenCalledWith('scheduled_start_at', '2026-03-11T00:00:00.000Z');
    expect(client._chain.gt).toHaveBeenCalledWith('scheduled_end_at', '2026-03-10T00:00:00.000Z');
    expect(blocks).toHaveLength(1);
  });
});
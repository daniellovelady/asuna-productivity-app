import { describe, expect, it, vi } from 'vitest';
import type { PostgrestError, SupabaseClient, User } from '@supabase/supabase-js';
import type { CompletedFocusSession } from '../../shared/focus/types';
import {
  createFocusSessionCloudService,
  resolvePersistableTaskId,
} from './focusSessionCloudService';

function createPostgrestError(code: string, message: string): PostgrestError {
  return {
    name: 'PostgrestError',
    message,
    code,
    details: '',
    hint: '',
  } as PostgrestError;
}

function createMockClient(): SupabaseClient {
  const tasksChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  const focusSessionsChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'tasks') {
        return tasksChain;
      }

      return focusSessionsChain;
    }),
    auth: {
      getUser: vi.fn(),
    },
    _tasksChain: tasksChain,
    _chain: focusSessionsChain,
  } as unknown as SupabaseClient & {
    _tasksChain: typeof tasksChain;
    _chain: typeof focusSessionsChain;
  };
}

const completed: CompletedFocusSession = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  targetDurationMs: 25 * 60_000,
  elapsedFocusMs: 25 * 60_000,
  startedAt: Date.parse('2026-08-27T09:00:00.000Z'),
  endedAt: Date.parse('2026-08-27T09:25:00.000Z'),
  accumulatedPausedMs: 0,
};

const sessionRow = {
  id: completed.id,
  user_id: 'user-id',
  task_id: 'task-id',
  task_title_snapshot: 'Demo task',
  target_duration_minutes: 25,
  started_at: '2026-08-27T09:00:00.000Z',
  ended_at: '2026-08-27T09:25:00.000Z',
  paused_seconds: 0,
  interruption_count: 0,
  status: 'completed' as const,
};

describe('resolvePersistableTaskId', () => {
  it('returns null when no task was snapshotted', async () => {
    const client = createMockClient();

    await expect(resolvePersistableTaskId(client, 'user-id', null)).resolves.toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('returns the task id when the task still exists', async () => {
    const client = createMockClient();
    client._tasksChain.maybeSingle.mockResolvedValue({ data: { id: 'task-id' }, error: null });

    await expect(resolvePersistableTaskId(client, 'user-id', 'task-id')).resolves.toBe('task-id');
  });

  it('returns null when the snapshotted task was deleted', async () => {
    const client = createMockClient();
    client._tasksChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(resolvePersistableTaskId(client, 'user-id', 'task-id')).resolves.toBeNull();
  });
});

describe('createFocusSessionCloudService', () => {
  it('saves an ended session with task id and title snapshot', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-id' } as User },
      error: null,
    });
    client._tasksChain.maybeSingle.mockResolvedValue({ data: { id: 'task-id' }, error: null });
    client._chain.single.mockResolvedValue({ data: sessionRow, error: null });

    const service = createFocusSessionCloudService(client);
    const saved = await service.saveEndedSession(completed, 'task-id', 'Demo task');

    expect(client._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'task-id',
        task_title_snapshot: 'Demo task',
      }),
    );
    expect(saved.id).toBe(completed.id);
    expect(saved.status).toBe('completed');
    expect(saved.taskTitle).toBe('Demo task');
  });

  it('saves a session without a task using null snapshot fields', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-id' } as User },
      error: null,
    });
    client._chain.single.mockResolvedValue({
      data: {
        ...sessionRow,
        task_id: null,
        task_title_snapshot: null,
      },
      error: null,
    });

    const service = createFocusSessionCloudService(client);
    const saved = await service.saveEndedSession(completed, null, null);

    expect(client.from).not.toHaveBeenCalledWith('tasks');
    expect(client._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: null,
        task_title_snapshot: null,
      }),
    );
    expect(saved.taskTitle).toBeNull();
  });

  it('perserves title snapshot when task was deleted before save', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-id' } as User },
      error: null,
    });
    client._tasksChain.maybeSingle.mockResolvedValue({ data: null, error: null });
    client._chain.single.mockResolvedValue({
      data: {
        ...sessionRow,
        task_id: null,
        task_title_snapshot: 'Demo task',
      },
      error: null,
    });

    const service = createFocusSessionCloudService(client);
    const saved = await service.saveEndedSession(completed, 'task-id', 'Demo task');

    expect(client._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: null,
        task_title_snapshot: 'Demo task',
      }),
    );
    expect(saved.taskTitle).toBe('Demo task');
  });

  it('treats duplicate key insert as success', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-id' } as User },
      error: null,
    });
    client._tasksChain.maybeSingle.mockResolvedValue({ data: { id: 'task-id' }, error: null });
    client._chain.single
      .mockResolvedValueOnce({
        data: null,
        error: createPostgrestError('23505', 'duplicate key value'),
      })
      .mockResolvedValueOnce({ data: sessionRow, error: null });

    const service = createFocusSessionCloudService(client);
    const saved = await service.saveEndedSession(completed, 'task-id', 'Demo task');

    expect(saved.id).toBe(completed.id);
    expect(client._chain.eq).toHaveBeenCalledWith('id', completed.id);
  });

  it('lists completed and abandoned sessions from title snapshot', async () => {
    const client = createMockClient();
    client._chain.order.mockResolvedValue({
      data: [
        sessionRow,
        {
          ...sessionRow,
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          status: 'abandoned',
          task_id: null,
          task_title_snapshot: 'Old task',
        },
      ],
      error: null,
    });

    const service = createFocusSessionCloudService(client);
    const sessions = await service.listEndedSessions();

    expect(sessions).toHaveLength(2);
    expect(sessions[0].taskTitle).toBe('Demo task');
    expect(sessions[1].status).toBe('abandoned');
    expect(sessions[1].taskTitle).toBe('Old task');
    expect(client._chain.in).toHaveBeenCalledWith('status', ['completed', 'abandoned']);
  });
});

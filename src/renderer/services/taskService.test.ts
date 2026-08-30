import { describe, expect, it, vi } from 'vitest';
import type { PostgrestError, SupabaseClient, User } from '@supabase/supabase-js';
import {
  createTaskService,
  mapTaskError,
  TaskConflictError,
  TaskServiceError,
} from './taskService';

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
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
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

const taskRow = {
  id: 'task-id',
  user_id: 'user-id',
  title: 'Test task',
  description: null,
  status: 'pending' as const,
  priority: 'medium' as const,
  created_at: '2026-08-27T09:00:00.000Z',
  completed_at: null,
  updated_at: '2026-08-27T09:00:00.000Z',
};

describe('mapTaskError', () => {
  it('maps PGRST116 to conflict message', () => {
    expect(mapTaskError(createPostgrestError('PGRST116', 'not found'))).toBe(
      'This task was updated elsewhere.',
    );
  });
});

describe('createTaskService', () => {
  it('lists tasks', async () => {
    const client = createMockClient();
    client._chain.order.mockResolvedValue({ data: [taskRow], error: null });

    const service = createTaskService(client);
    const tasks = await service.listTasks();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Test task');
    expect(tasks[0].updatedAt).toBe('2026-08-27T09:00:00.000Z');
  });

  it('creates a task with user_id from auth', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-id' } as User },
      error: null,
    });
    client._chain.single.mockResolvedValue({ data: taskRow, error: null });

    const service = createTaskService(client);
    const task = await service.createTask({ title: 'Test task' });

    expect(client.from).toHaveBeenCalledWith('tasks');
    expect(task.id).toBe('task-id');
  });

  it('creates a task with description', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-id' } as User },
      error: null,
    });
    client._chain.single.mockResolvedValue({
      data: { ...taskRow, description: 'Notes' },
      error: null,
    });

    const service = createTaskService(client);
    const task = await service.createTask({ title: 'Test task', description: 'Notes' });

    expect(client._chain.insert).toHaveBeenCalledWith({
      title: 'Test task',
      description: 'Notes',
      priority: 'medium',
      status: 'pending',
      user_id: 'user-id',
    });
    expect(task.description).toBe('Notes');
  });

  it('creates a task with null description when omitted', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-id' } as User },
      error: null,
    });
    client._chain.single.mockResolvedValue({ data: taskRow, error: null });

    const service = createTaskService(client);
    await service.createTask({ title: 'Test task' });

    expect(client._chain.insert).toHaveBeenCalledWith({
      title: 'Test task',
      description: null,
      priority: 'medium',
      status: 'pending',
      user_id: 'user-id',
    });
  });

  it('creates a task with explicit priority', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-id' } as User },
      error: null,
    });
    client._chain.single.mockResolvedValue({
      data: { ...taskRow, priority: 'high' },
      error: null,
    });

    const service = createTaskService(client);
    const task = await service.createTask({ title: 'Test task', priority: 'high' });

    expect(client._chain.insert).toHaveBeenCalledWith({
      title: 'Test task',
      description: null,
      priority: 'high',
      status: 'pending',
      user_id: 'user-id',
    });
    expect(task.priority).toBe('high');
  });

  it('updates description', async () => {
    const client = createMockClient();
    client._chain.single.mockResolvedValue({
      data: { ...taskRow, description: 'Updated notes' },
      error: null,
    });

    const service = createTaskService(client);
    const updated = await service.updateTask(
      'task-id',
      { title: 'Test task', description: 'Updated notes' },
      taskRow.updated_at,
    );

    expect(client._chain.update).toHaveBeenCalledWith({
      title: 'Test task',
      description: 'Updated notes',
    });
    expect(updated.description).toBe('Updated notes');
  });

  it('updates priority', async () => {
    const client = createMockClient();
    client._chain.single.mockResolvedValue({
      data: { ...taskRow, priority: 'low' },
      error: null,
    });

    const service = createTaskService(client);
    const updated = await service.updateTask(
      'task-id',
      { priority: 'low' },
      taskRow.updated_at,
    );

    expect(client._chain.update).toHaveBeenCalledWith({
      priority: 'low',
    });
    expect(updated.priority).toBe('low');
  });

  it('clears description with explicit null', async () => {
    const client = createMockClient();
    client._chain.single.mockResolvedValue({
      data: { ...taskRow, description: null },
      error: null,
    });

    const service = createTaskService(client);
    await service.updateTask(
      'task-id',
      { description: null },
      taskRow.updated_at,
    );

    expect(client._chain.update).toHaveBeenCalledWith({
      description: null,
    });
  });

  it('throws conflict on stale update', async () => {
    const client = createMockClient();
    client._chain.single.mockResolvedValue({
      data: null,
      error: createPostgrestError('PGRST116', 'not found'),
    });

    const service = createTaskService(client);

    await expect(
      service.updateTask('task-id', { title: 'Updated' }, taskRow.updated_at),
    ).rejects.toBeInstanceOf(TaskConflictError);
  });

  it('throws conflict on stale delete', async () => {
    const client = createMockClient();
    client._chain.single.mockResolvedValue({
      data: null,
      error: createPostgrestError('PGRST116', 'not found'),
    });

    const service = createTaskService(client);

    await expect(
      service.deleteTask('task-id', taskRow.updated_at),
    ).rejects.toBeInstanceOf(TaskConflictError);
  });

  it('completes a task with status and completed_at', async () => {
    const completedAt = '2026-08-29T12:00:00.000Z';
    vi.useFakeTimers();
    vi.setSystemTime(new Date(completedAt));

    const client = createMockClient();
    client._chain.single.mockResolvedValue({
      data: {
        ...taskRow,
        status: 'completed',
        completed_at: completedAt,
      },
      error: null,
    });

    const service = createTaskService(client);
    const completed = await service.completeTask('task-id', taskRow.updated_at);

    expect(client._chain.update).toHaveBeenCalledWith({
      status: 'completed',
      completed_at: completedAt,
    });
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBe(completedAt);

    vi.useRealTimers();
  });

  it('deletes with expectedUpdatedAt filter', async () => {
    const client = createMockClient();
    client._chain.single.mockResolvedValue({ data: taskRow, error: null });

    const service = createTaskService(client);
    const deleted = await service.deleteTask('task-id', taskRow.updated_at);

    expect(client._chain.delete).toHaveBeenCalled();
    expect(client._chain.eq).toHaveBeenCalledWith('id', 'task-id');
    expect(client._chain.eq).toHaveBeenCalledWith('updated_at', taskRow.updated_at);
    expect(deleted.id).toBe('task-id');
  });

  it('requires authentication for create', async () => {
    const client = createMockClient();
    vi.mocked(client.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const service = createTaskService(client);

    await expect(service.createTask({ title: 'Test' })).rejects.toBeInstanceOf(
      TaskServiceError,
    );
  });
});

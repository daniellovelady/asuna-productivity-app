import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type {
  CreateTaskInput,
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from '../types/task';

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export class TaskConflictError extends Error {
  constructor(message = 'This task was updated elsewhere.') {
    super(message);
    this.name = 'TaskConflictError';
  }
}

export class TaskServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskServiceError';
  }
}

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

export function mapTaskError(error: PostgrestError | Error | null): string {
  if (!error) {
    return 'An unexpected error occurred.';
  }

  if (error instanceof Error && !('code' in error)) {
    return error.message;
  }

  const pgError = error as PostgrestError;
  const message = pgError.message.toLowerCase();

  if (pgError.code === 'PGRST116') {
    return 'This task was updated elsewhere.';
  }

  if (message.includes('fetch') || pgError.code === '' || message.includes('network')) {
    return 'Unable to reach the server. Check your connection.';
  }

  return pgError.message;
}

function isConflictError(error: PostgrestError | null): boolean {
  return error?.code === 'PGRST116';
}

async function getAuthenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new TaskServiceError('You must be signed in to manage tasks.');
  }

  return data.user.id;
}

export function createTaskService(client: SupabaseClient) {
  return {
    listTasks: async (): Promise<Task[]> => {
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new TaskServiceError(mapTaskError(error));
      }

      return (data as TaskRow[]).map(mapTaskRow);
    },

    createTask: async (input: CreateTaskInput): Promise<Task> => {
      const userId = await getAuthenticatedUserId(client);

      const { data, error } = await client
        .from('tasks')
        .insert({
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? 'medium',
          status: 'pending',
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw new TaskServiceError(mapTaskError(error));
      }

      return mapTaskRow(data as TaskRow);
    },

    updateTask: async (
      id: string,
      patch: UpdateTaskInput,
      expectedUpdatedAt: string,
    ): Promise<Task> => {
      const updatePayload: Record<string, unknown> = {};

      if (patch.title !== undefined) {
        updatePayload.title = patch.title;
      }

      if (patch.description !== undefined) {
        updatePayload.description = patch.description;
      }

      if (patch.status !== undefined) {
        updatePayload.status = patch.status;
      }

      if (patch.priority !== undefined) {
        updatePayload.priority = patch.priority;
      }

      const { data, error } = await client
        .from('tasks')
        .update(updatePayload)
        .eq('id', id)
        .eq('updated_at', expectedUpdatedAt)
        .select()
        .single();

      if (error) {
        if (isConflictError(error)) {
          throw new TaskConflictError();
        }

        throw new TaskServiceError(mapTaskError(error));
      }

      return mapTaskRow(data as TaskRow);
    },

    completeTask: async (id: string, expectedUpdatedAt: string): Promise<Task> => {
      const { data, error } = await client
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('updated_at', expectedUpdatedAt)
        .select()
        .single();

      if (error) {
        if (isConflictError(error)) {
          throw new TaskConflictError();
        }

        throw new TaskServiceError(mapTaskError(error));
      }

      return mapTaskRow(data as TaskRow);
    },

    deleteTask: async (id: string, expectedUpdatedAt: string): Promise<Task> => {
      const { data, error } = await client
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('updated_at', expectedUpdatedAt)
        .select()
        .single();

      if (error) {
        if (isConflictError(error)) {
          throw new TaskConflictError();
        }

        throw new TaskServiceError(mapTaskError(error));
      }

      if (!data) {
        throw new TaskConflictError();
      }

      return mapTaskRow(data as TaskRow);
    },
  };
}

export const taskService = createTaskService(supabase);

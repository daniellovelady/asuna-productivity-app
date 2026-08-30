import type { CompletedFocusSession } from '../../shared/focus/types';
import { computeFocusMinutes, toFocusSessionRow } from '../../shared/focus/sessionMapper';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { EndedSession, FocusSessionRow } from '../types/focusSession';

export class FocusSessionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FocusSessionServiceError';
  }
}

function isDuplicateKeyError(error: PostgrestError): boolean {
  return error.code === '23505' || error.message.toLowerCase().includes('duplicate key');
}

function mapEndedSession(row: FocusSessionRow): EndedSession {
  const endedAt = row.ended_at ?? row.started_at;

  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title_snapshot ?? null,
    targetDurationMinutes: row.target_duration_minutes,
    startedAt: row.started_at,
    endedAt,
    pausedSeconds: row.paused_seconds,
    status: row.status === 'completed' ? 'completed' : 'abandoned',
    focusMinutes: computeFocusMinutes(row.started_at, endedAt, row.paused_seconds),
  };
}

async function getAuthenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new FocusSessionServiceError('You must be signed in to save focus sessions.');
  }

  return data.user.id;
}

export async function resolvePersistableTaskId(
  client: SupabaseClient,
  userId: string,
  snapshottedTaskId: string | null,
): Promise<string | null> {
  if (snapshottedTaskId === null) {
    return null;
  }

  const { data, error } = await client
    .from('tasks')
    .select('id')
    .eq('id', snapshottedTaskId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new FocusSessionServiceError(error.message);
  }

  return data ? snapshottedTaskId : null;
}

export function createFocusSessionCloudService(client: SupabaseClient) {
  return {
    saveEndedSession: async (
      completed: CompletedFocusSession,
      taskId: string | null,
      taskTitleSnapshot: string | null,
    ): Promise<EndedSession> => {
      const userId = await getAuthenticatedUserId(client);
      const persistableTaskId = await resolvePersistableTaskId(client, userId, taskId);
      const row = toFocusSessionRow(completed, userId, persistableTaskId, taskTitleSnapshot);

      const { data, error } = await client
        .from('focus_sessions')
        .insert(row)
        .select('*')
        .single();

      if (!error) {
        return mapEndedSession(data as FocusSessionRow);
      }

      if (isDuplicateKeyError(error)) {
        const { data: existing, error: fetchError } = await client
          .from('focus_sessions')
          .select('*')
          .eq('id', completed.id)
          .single();

        if (fetchError || !existing) {
          throw new FocusSessionServiceError(error.message);
        }

        return mapEndedSession(existing as FocusSessionRow);
      }

      throw new FocusSessionServiceError(error.message);
    },

    listEndedSessions: async (): Promise<EndedSession[]> => {
      const { data, error } = await client
        .from('focus_sessions')
        .select('*')
        .in('status', ['completed', 'abandoned'])
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false });

      if (error) {
        throw new FocusSessionServiceError(error.message);
      }

      return (data as FocusSessionRow[]).map(mapEndedSession);
    },
  };
}

export const focusSessionCloudService = createFocusSessionCloudService(supabase);

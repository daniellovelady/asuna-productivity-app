import type { FocusPersistenceContext } from '../../shared/focus/focusStartIntent';
import type { CompletedFocusSession } from '../../shared/focus/types';
import { computeFocusMinutes, toFocusSessionRow } from '../../shared/focus/sessionMapper';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { RollingSevenDayWindow } from '../utils/focusHistoryWindow';
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
  const contextType = row.context_type ?? 'none';
  const contextTitleSnapshot = row.context_title_snapshot ?? null;
  const taskTitleSnapshot = row.task_title_snapshot ?? null;

  let taskTitle = contextTitleSnapshot ?? taskTitleSnapshot;
  if (contextType === 'none' && !taskTitle) {
    taskTitle = null;
  }

  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle,
    contextType,
    contextTitleSnapshot,
    taskTitleSnapshot,
    externalCalendarId: row.external_calendar_id ?? null,
    externalEventId: row.external_calendar_event_id ?? null,
    calendarProvider: row.calendar_provider ?? null,
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
      persistence: FocusPersistenceContext,
    ): Promise<EndedSession> => {
      const authUserId = await getAuthenticatedUserId(client);

      if (!completed.ownerUserId) {
        throw new FocusSessionServiceError('Focus session is missing owner information.');
      }

      if (completed.ownerUserId !== authUserId) {
        throw new FocusSessionServiceError(
          'This session belongs to a different account. Sign in as the session owner to save it.',
        );
      }

      const persistableTaskId = await resolvePersistableTaskId(
        client,
        completed.ownerUserId,
        persistence.taskId,
      );
      const row = toFocusSessionRow(
        completed,
        completed.ownerUserId,
        {
          ...persistence,
          taskId: persistableTaskId,
        },
      );

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

    deleteEndedSession: async (sessionId: string): Promise<void> => {
      await getAuthenticatedUserId(client);

      const { error, count } = await client
        .from('focus_sessions')
        .delete({ count: 'exact' })
        .eq('id', sessionId)
        .in('status', ['completed', 'abandoned'])
        .not('ended_at', 'is', null);

      if (error) {
        throw new FocusSessionServiceError(error.message);
      }

      if (count === 0) {
        throw new FocusSessionServiceError('Session could not be deleted.');
      }
    },

    countEndedSessionsInWindow: async (
      window: RollingSevenDayWindow,
    ): Promise<number> => {
      await getAuthenticatedUserId(client);

      const { count, error } = await client
        .from('focus_sessions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['completed', 'abandoned'])
        .not('ended_at', 'is', null)
        .gte('ended_at', window.windowStartIso)
        .lte('ended_at', window.windowEndIso);

      if (error) {
        throw new FocusSessionServiceError(error.message);
      }

      return count ?? 0;
    },

    deleteEndedSessionsInWindow: async (
      window: RollingSevenDayWindow,
    ): Promise<number> => {
      await getAuthenticatedUserId(client);

      const { count, error } = await client
        .from('focus_sessions')
        .delete({ count: 'exact' })
        .in('status', ['completed', 'abandoned'])
        .not('ended_at', 'is', null)
        .gte('ended_at', window.windowStartIso)
        .lte('ended_at', window.windowEndIso);

      if (error) {
        throw new FocusSessionServiceError(error.message);
      }

      return count ?? 0;
    },
  };
}

export const focusSessionCloudService = createFocusSessionCloudService(supabase);

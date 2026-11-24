import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { mapScheduleBlockRow } from '../../shared/scheduling/mapScheduleBlock';
import type { ScheduleBlock, ScheduleBlockRow } from '../../shared/scheduling/types';
import { isValidScheduleBlockTimeRange } from '../../shared/scheduling/validation';
import { supabase } from './supabaseClient';

export interface ListScheduleBlocksOptions {
  rangeStart: string;
  rangeEnd: string;
  includeCancelled?: boolean;
}

export interface CreateScheduleBlockInput {
  taskId: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
}

export interface MoveScheduleBlockInput {
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone?: string;
}

export class ScheduleBlockServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleBlockServiceError';
  }
}

export class ScheduleBlockConflictError extends Error {
  constructor(message = 'This schedule block was updated elsewhere.') {
    super(message);
    this.name = 'ScheduleBlockConflictError';
  }
}

function mapScheduleBlockError(error: PostgrestError | Error | null): string {
  if (!error) {
    return 'An unexpected error occurred.';
  }

  if (error instanceof Error && !('code' in error)) {
    return error.message;
  }

  const pgError = error as PostgrestError;
  if (pgError.code === 'PGRST116') {
    return 'This schedule block was updated elsewhere.';
  }

  return pgError.message;
}

function isConflictError(error: PostgrestError | null): boolean {
  return error?.code === 'PGRST116';
}

async function getAuthenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new ScheduleBlockServiceError('You must be signed in to manage schedule blocks.');
  }

  return data.user.id;
}

function assertValidTimeRange(scheduledStartAt: string, scheduledEndAt: string): void {
  if (!isValidScheduleBlockTimeRange(scheduledStartAt, scheduledEndAt)) {
    throw new ScheduleBlockServiceError('Schedule end must be after schedule start.');
  }
}

function assertTimezone(timezone: string): void {
  const trimmed = timezone.trim();
  if (!trimmed) {
    throw new ScheduleBlockServiceError('Timezone is required.');
  }
}

export function createScheduleBlockService(client: SupabaseClient) {
  return {
    listScheduleBlocks: async (
      options: ListScheduleBlocksOptions,
    ): Promise<ScheduleBlock[]> => {
      let query = client
        .from('task_schedule_blocks')
        .select('*')
        .lt('scheduled_start_at', options.rangeEnd)
        .gt('scheduled_end_at', options.rangeStart);

      if (!options.includeCancelled) {
        query = query.eq('status', 'scheduled');
      }

      const { data, error } = await query.order('scheduled_start_at', { ascending: true });

      if (error) {
        throw new ScheduleBlockServiceError(mapScheduleBlockError(error));
      }

      return (data as ScheduleBlockRow[]).map(mapScheduleBlockRow);
    },

    createScheduleBlock: async (
      input: CreateScheduleBlockInput,
    ): Promise<ScheduleBlock> => {
      assertTimezone(input.timezone);
      assertValidTimeRange(input.scheduledStartAt, input.scheduledEndAt);

      const userId = await getAuthenticatedUserId(client);

      const { data, error } = await client
        .from('task_schedule_blocks')
        .insert({
          user_id: userId,
          task_id: input.taskId,
          scheduled_start_at: input.scheduledStartAt,
          scheduled_end_at: input.scheduledEndAt,
          timezone: input.timezone.trim(),
          status: 'scheduled',
          google_sync_state: 'synced',
        })
        .select()
        .single();

      if (error) {
        throw new ScheduleBlockServiceError(mapScheduleBlockError(error));
      }

      return mapScheduleBlockRow(data as ScheduleBlockRow);
    },

    moveScheduleBlock: async (
      id: string,
      input: MoveScheduleBlockInput,
      expectedUpdatedAt: string,
    ): Promise<ScheduleBlock> => {
      assertValidTimeRange(input.scheduledStartAt, input.scheduledEndAt);

      const updatePayload: Record<string, unknown> = {
        scheduled_start_at: input.scheduledStartAt,
        scheduled_end_at: input.scheduledEndAt,
      };

      if (input.timezone !== undefined) {
        assertTimezone(input.timezone);
        updatePayload.timezone = input.timezone.trim();
      }

      return updateScheduleBlockRow(client, id, updatePayload, expectedUpdatedAt);
    },

    updateScheduleBlockTime: async (
      id: string,
      input: MoveScheduleBlockInput,
      expectedUpdatedAt: string,
    ): Promise<ScheduleBlock> => {
      assertValidTimeRange(input.scheduledStartAt, input.scheduledEndAt);

      const updatePayload: Record<string, unknown> = {
        scheduled_start_at: input.scheduledStartAt,
        scheduled_end_at: input.scheduledEndAt,
      };

      if (input.timezone !== undefined) {
        assertTimezone(input.timezone);
        updatePayload.timezone = input.timezone.trim();
      }

      return updateScheduleBlockRow(client, id, updatePayload, expectedUpdatedAt);
    },

    cancelScheduleBlock: async (
      id: string,
      expectedUpdatedAt: string,
    ): Promise<ScheduleBlock> => {
      const cancelledAt = new Date().toISOString();

      return updateScheduleBlockRow(
        client,
        id,
        {
          status: 'cancelled',
          cancel_reason: 'user_unscheduled',
          cancelled_at: cancelledAt,
        },
        expectedUpdatedAt,
      );
    },

    restoreScheduleBlock: async (
      id: string,
      expectedUpdatedAt: string,
    ): Promise<ScheduleBlock> => {
      return updateScheduleBlockRow(
        client,
        id,
        {
          status: 'scheduled',
          cancel_reason: null,
          cancelled_at: null,
        },
        expectedUpdatedAt,
      );
    },
  };
}

async function updateScheduleBlockRow(
  client: SupabaseClient,
  id: string,
  updatePayload: Record<string, unknown>,
  expectedUpdatedAt: string,
): Promise<ScheduleBlock> {
  const { data, error } = await client
    .from('task_schedule_blocks')
    .update(updatePayload)
    .eq('id', id)
    .eq('updated_at', expectedUpdatedAt)
    .select()
    .single();

  if (error) {
    if (isConflictError(error)) {
      throw new ScheduleBlockConflictError();
    }

    throw new ScheduleBlockServiceError(mapScheduleBlockError(error));
  }

  return mapScheduleBlockRow(data as ScheduleBlockRow);
}

export const scheduleBlockService = createScheduleBlockService(supabase);
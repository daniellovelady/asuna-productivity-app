import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ActivityClassification,
  ActivitySamplePayload,
  BufferedActivitySample,
} from '../../shared/activity/types';
import { supabase } from './supabaseClient';

export class ActivityCloudServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivityCloudServiceError';
  }
}

async function getAuthenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new ActivityCloudServiceError('You must be signed in to save activity samples.');
  }

  return data.user.id;
}

export async function insertActivitySample(
  client: SupabaseClient,
  payload: ActivitySamplePayload,
): Promise<void> {
  const userId = await getAuthenticatedUserId(client);

  const { error } = await client.from('activity_samples').insert({
    user_id: userId,
    session_id: payload.sessionId,
    recorded_at: payload.recordedAt,
    application_name: payload.applicationName,
    idle_seconds: payload.idleSeconds,
    classification: payload.classification,
  });

  if (error) {
    throw new ActivityCloudServiceError('Failed to save activity sample.');
  }
}

export async function bulkInsertSessionSamples(
  client: SupabaseClient,
  sessionId: string,
  samples: BufferedActivitySample[],
): Promise<void> {
  if (samples.length === 0) {
    return;
  }

  const userId = await getAuthenticatedUserId(client);

  const rows = samples.map((sample) => ({
    user_id: userId,
    session_id: sessionId,
    recorded_at: sample.recordedAt,
    application_name: sample.applicationName,
    idle_seconds: sample.idleSeconds,
    classification: sample.classification as ActivityClassification,
  }));

  const { error } = await client.from('activity_samples').insert(rows);

  if (error) {
    throw new ActivityCloudServiceError('Failed to save focus session activity samples.');
  }
}

export const activityCloudService = {
  insertActivitySample: (payload: ActivitySamplePayload) =>
    insertActivitySample(supabase, payload),
  bulkInsertSessionSamples: (sessionId: string, samples: BufferedActivitySample[]) =>
    bulkInsertSessionSamples(supabase, sessionId, samples),
};

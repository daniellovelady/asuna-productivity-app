import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  bulkInsertSessionSamples,
  insertActivitySample,
} from './activityCloudService';

function createMockClient(userId: string) {
  const insert = vi.fn().mockResolvedValue({ error: null });

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn(() => ({ insert })),
  } as unknown as SupabaseClient;

  return { client, insert };
}

describe('activityCloudService', () => {
  it('sources user ownership from authenticated Supabase auth', async () => {
    const { client, insert } = createMockClient('auth-user');

    await insertActivitySample(client, {
      recordedAt: '2026-01-01T00:00:00.000Z',
      applicationName: 'vscode',
      idleSeconds: 0,
      classification: 'productive',
      sessionId: null,
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: 'auth-user',
      session_id: null,
      recorded_at: '2026-01-01T00:00:00.000Z',
      application_name: 'vscode',
      idle_seconds: 0,
      classification: 'productive',
    });
  });

  it('bulk inserts session samples with auth user id', async () => {
    const { client, insert } = createMockClient('auth-user');

    await bulkInsertSessionSamples(client, 'session-1', [
      {
        recordedAt: '2026-01-01T00:00:00.000Z',
        applicationName: 'vscode',
        idleSeconds: 0,
        classification: 'productive',
      },
    ]);

    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'auth-user',
        session_id: 'session-1',
      }),
    ]);
  });
});

import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const hasRlsTestEnv = Boolean(
  process.env.RLS_TEST_ACCOUNT_A_EMAIL
  && process.env.RLS_TEST_ACCOUNT_A_PASSWORD
  && process.env.RLS_TEST_ACCOUNT_B_EMAIL
  && process.env.RLS_TEST_ACCOUNT_B_PASSWORD
  && process.env.VITE_SUPABASE_URL
  && process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

describe.skipIf(!hasRlsTestEnv)('analytics RLS isolation', () => {
  it('prevents Account B from seeing Account A analytics', async () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

    const clientA = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const clientB = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const signInA = await clientA.auth.signInWithPassword({
      email: process.env.RLS_TEST_ACCOUNT_A_EMAIL as string,
      password: process.env.RLS_TEST_ACCOUNT_A_PASSWORD as string,
    });
    expect(signInA.error).toBeNull();

    const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const { error: insertError } = await clientA.from('focus_sessions').insert({
      id: sessionId,
      user_id: signInA.data.user?.id,
      task_id: null,
      task_title_snapshot: 'RLS analytics test',
      target_duration_minutes: 25,
      started_at: '2026-08-31T10:00:00.000Z',
      ended_at: '2026-08-31T10:25:00.000Z',
      paused_seconds: 0,
      interruption_count: 1,
      status: 'completed',
    });

    expect(insertError).toBeNull();

    const { data: snapshotA, error: rpcErrorA } = await clientA.rpc('get_analytics_snapshot');
    expect(rpcErrorA).toBeNull();
    expect(snapshotA.totalFocusMinutes).toBeGreaterThan(0);
    expect(snapshotA.completedSessions).toBeGreaterThan(0);
    expect(snapshotA.interruptionCount).toBeGreaterThan(0);

    await clientA.auth.signOut();

    const signInB = await clientB.auth.signInWithPassword({
      email: process.env.RLS_TEST_ACCOUNT_B_EMAIL as string,
      password: process.env.RLS_TEST_ACCOUNT_B_PASSWORD as string,
    });
    expect(signInB.error).toBeNull();

    const { data: snapshotB, error: rpcErrorB } = await clientB.rpc('get_analytics_snapshot');
    expect(rpcErrorB).toBeNull();
    expect(snapshotB.totalFocusMinutes).toBe(0);
    expect(snapshotB.completedSessions).toBe(0);
    expect(snapshotB.interruptionCount).toBe(0);
    expect(snapshotB.topDistractingApps).toEqual([]);

    await clientB.auth.signOut();

    const signInAAgain = await clientA.auth.signInWithPassword({
      email: process.env.RLS_TEST_ACCOUNT_A_EMAIL as string,
      password: process.env.RLS_TEST_ACCOUNT_A_PASSWORD as string,
    });
    expect(signInAAgain.error).toBeNull();

    await clientA.from('focus_sessions').delete().eq('id', sessionId);
    await clientA.auth.signOut();
  });
});

import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createTaskService } from './taskService';

const hasRlsTestEnv = Boolean(
  process.env.RLS_TEST_ACCOUNT_A_EMAIL
  && process.env.RLS_TEST_ACCOUNT_A_PASSWORD
  && process.env.RLS_TEST_ACCOUNT_B_EMAIL
  && process.env.RLS_TEST_ACCOUNT_B_PASSWORD
  && process.env.VITE_SUPABASE_URL
  && process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

describe.skipIf(!hasRlsTestEnv)('task RLS isolation', () => {
  it('prevents Account B from reading or modifying Account A task', async () => {
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

    const taskServiceA = createTaskService(clientA);
    const created = await taskServiceA.createTask({ title: 'A-secret' });
    const taskId = created.id;

    await clientA.auth.signOut();

    const signInB = await clientB.auth.signInWithPassword({
      email: process.env.RLS_TEST_ACCOUNT_B_EMAIL as string,
      password: process.env.RLS_TEST_ACCOUNT_B_PASSWORD as string,
    });
    expect(signInB.error).toBeNull();

    const { data: selectData, error: selectError } = await clientB
      .from('tasks')
      .select('*')
      .eq('id', taskId);

    expect(selectError).toBeNull();
    expect(selectData).toEqual([]);

    const { data: updateData, error: updateError } = await clientB
      .from('tasks')
      .update({ title: 'hacked' })
      .eq('id', taskId)
      .select();

    if (updateError) {
      expect(updateError).toBeTruthy();
    } else {
      expect(updateData).toEqual([]);
    }

    const { data: deleteData, error: deleteError } = await clientB
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .select();

    if (deleteError) {
      expect(deleteError).toBeTruthy();
    } else {
      expect(deleteData).toEqual([]);
    }

    await clientB.auth.signOut();

    const signInAAgain = await clientA.auth.signInWithPassword({
      email: process.env.RLS_TEST_ACCOUNT_A_EMAIL as string,
      password: process.env.RLS_TEST_ACCOUNT_A_PASSWORD as string,
    });
    expect(signInAAgain.error).toBeNull();

    const { data: ownerData, error: ownerError } = await clientA
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    expect(ownerError).toBeNull();
    expect(ownerData?.title).toBe('A-secret');

    await clientA.from('tasks').delete().eq('id', taskId);
    await clientA.auth.signOut();
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationDir = join(process.cwd(), 'supabase', 'migrations');

const RPC_NAMES = [
  'complete_task_and_cancel_future_blocks(uuid, timestamptz)',
  'delete_task_with_schedule_block_cleanup(uuid, timestamptz)',
] as const;

function readMigration(filename: string): string {
  return readFileSync(join(migrationDir, filename), 'utf8');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertHardenedGrants(sql: string, rpc: string): void {
  const signature = escapeRegExp(rpc);
  expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${signature} FROM PUBLIC;`));
  expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${signature} FROM anon;`));
  expect(sql).toMatch(
    new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${signature} TO authenticated;`),
  );
  expect(sql).not.toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${signature} TO anon;`));
}

describe('ScheduleBlock task RPC EXECUTE grants (migration contract)', () => {
  const phase1Sql = readMigration('20261002140000_task_schedule_blocks.sql');
  const grantFixSql = readMigration('20261002150000_task_schedule_block_rpc_execute_grants.sql');

  for (const rpc of RPC_NAMES) {
    it(`${rpc}: Phase 1 migration denies anon and allows authenticated`, () => {
      assertHardenedGrants(phase1Sql, rpc);
    });

    it(`${rpc}: grant hardening migration matches live fix`, () => {
      assertHardenedGrants(grantFixSql, rpc);
    });
  }
});
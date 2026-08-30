import { describe, expect, it } from 'vitest';
import type { CompletedFocusSession } from './types';
import { computeFocusMinutes, toFocusSessionRow } from './sessionMapper';

function createCompleted(overrides: Partial<CompletedFocusSession> = {}): CompletedFocusSession {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    targetDurationMs: 25 * 60_000,
    elapsedFocusMs: 20 * 60_000,
    startedAt: Date.parse('2026-08-27T09:00:00.000Z'),
    endedAt: Date.parse('2026-08-27T09:20:00.000Z'),
    accumulatedPausedMs: 0,
    ...overrides,
  };
}

describe('toFocusSessionRow', () => {
  it('passes through the engine session UUID as id', () => {
    const row = toFocusSessionRow(
      createCompleted({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
      'user-id',
      null,
      null,
    );

    expect(row.id).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });

  it('maps completed status when elapsed meets target', () => {
    const row = toFocusSessionRow(
      createCompleted({ elapsedFocusMs: 25 * 60_000 }),
      'user-id',
      'task-id',
      'Demo task',
    );

    expect(row.status).toBe('completed');
    expect(row.task_id).toBe('task-id');
    expect(row.task_title_snapshot).toBe('Demo task');
    expect(row.target_duration_minutes).toBe(25);
    expect(row.paused_seconds).toBe(0);
  });

  it('maps abandoned status when stopped early', () => {
    const row = toFocusSessionRow(
      createCompleted({ elapsedFocusMs: 10 * 60_000 }),
      'user-id',
      null,
      null,
    );

    expect(row.status).toBe('abandoned');
    expect(row.task_id).toBeNull();
    expect(row.task_title_snapshot).toBeNull();
  });

  it('preserves title snapshot when resolved task id is null', () => {
    const row = toFocusSessionRow(
      createCompleted(),
      'user-id',
      null,
      'Deleted task',
    );

    expect(row.task_id).toBeNull();
    expect(row.task_title_snapshot).toBe('Deleted task');
  });

  it('rounds paused seconds', () => {
    const row = toFocusSessionRow(
      createCompleted({ accumulatedPausedMs: 1500 }),
      'user-id',
      null,
      null,
    );

    expect(row.paused_seconds).toBe(2);
  });
});

describe('computeFocusMinutes', () => {
  it('subtracts paused seconds from elapsed time', () => {
    const minutes = computeFocusMinutes(
      '2026-08-27T09:00:00.000Z',
      '2026-08-27T09:25:00.000Z',
      300,
    );

    expect(minutes).toBe(20);
  });
});

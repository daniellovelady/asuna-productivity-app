import { afterEach, describe, expect, it, vi } from 'vitest';

const { rpc, fromMock } = vi.hoisted(() => ({
  rpc: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('./supabaseClient', () => ({
  supabase: {
    rpc,
    from: fromMock,
  },
}));

import { SessionAttributionError, setSessionTaskAttribution } from './sessionAttributionService';

afterEach(() => {
  rpc.mockReset();
});

describe('sessionAttributionService', () => {
  it('calls set_focus_session_task_attribution RPC', async () => {
    rpc.mockResolvedValue({ error: null });

    await setSessionTaskAttribution('session-1', 'task-9');

    expect(rpc).toHaveBeenCalledWith('set_focus_session_task_attribution', {
      p_session_id: 'session-1',
      p_task_id: 'task-9',
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('does not touch calendar_event_task_links or focus_sessions update', async () => {
    rpc.mockResolvedValue({ error: null });

    await setSessionTaskAttribution('session-1', 'task-9');

    expect(fromMock).not.toHaveBeenCalled();
  });

  it('surfaces RPC errors', async () => {
    rpc.mockResolvedValue({ error: { message: 'Task not found' } });

    await expect(setSessionTaskAttribution('session-1', 'task-9'))
      .rejects.toThrow(SessionAttributionError);
  });
});

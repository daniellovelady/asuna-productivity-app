import { supabase } from './supabaseClient';

export class SessionAttributionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionAttributionError';
  }
}

export async function setSessionTaskAttribution(
  sessionId: string,
  taskId: string,
): Promise<void> {
  const { error } = await supabase.rpc('set_focus_session_task_attribution', {
    p_session_id: sessionId,
    p_task_id: taskId,
  });

  if (error) {
    throw new SessionAttributionError(error.message);
  }
}

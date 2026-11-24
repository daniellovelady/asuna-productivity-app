import { supabase } from './supabaseClient';

export interface CalendarEventTaskLink {
  id: string;
  externalCalendarId: string;
  externalEventId: string;
  taskId: string;
  eventTitleSnapshot: string | null;
}

export class CalendarEventTaskLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarEventTaskLinkError';
  }
}

export async function listCalendarEventTaskLinks(): Promise<CalendarEventTaskLink[]> {
  const { data, error } = await supabase
    .from('calendar_event_task_links')
    .select('id, external_calendar_id, external_event_id, task_id, event_title_snapshot');

  if (error) {
    throw new CalendarEventTaskLinkError(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    externalCalendarId: row.external_calendar_id as string,
    externalEventId: row.external_event_id as string,
    taskId: row.task_id as string,
    eventTitleSnapshot: (row.event_title_snapshot as string | null) ?? null,
  }));
}

export async function createCalendarEventTaskLink(input: {
  externalCalendarId: string;
  externalEventId: string;
  taskId: string;
  eventTitleSnapshot?: string | null;
}): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new CalendarEventTaskLinkError('You must be signed in to link tasks.');
  }

  const { error } = await supabase.from('calendar_event_task_links').insert({
    user_id: userData.user.id,
    calendar_provider: 'google',
    external_calendar_id: input.externalCalendarId,
    external_event_id: input.externalEventId,
    task_id: input.taskId,
    event_title_snapshot: input.eventTitleSnapshot ?? null,
  });

  if (error) {
    throw new CalendarEventTaskLinkError(error.message);
  }
}

export async function deleteCalendarEventTaskLink(
  externalCalendarId: string,
  externalEventId: string,
): Promise<void> {
  const { error } = await supabase
    .from('calendar_event_task_links')
    .delete()
    .eq('external_calendar_id', externalCalendarId)
    .eq('external_event_id', externalEventId);

  if (error) {
    throw new CalendarEventTaskLinkError(error.message);
  }
}

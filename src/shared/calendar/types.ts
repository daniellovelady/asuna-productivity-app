export type CalendarProvider = 'google';

export type CalendarAccountStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reauth_required'
  | 'error';

export interface CalendarAccount {
  provider: CalendarProvider;
  status: CalendarAccountStatus;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  syncError: string | null;
}

export interface CalendarListEntry {
  id: string;
  provider: CalendarProvider;
  name: string;
  primary: boolean;
}

export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface CalendarEvent {
  externalEventId: string;
  calendarId: string;
  calendarName: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string | null;
  status: CalendarEventStatus;
  provider: CalendarProvider;
  lastSyncedAt: string;
  linkedTaskId: string | null;
  /** Google extendedProperties.private.asuna_schedule_block_id when present. */
  mirrorScheduleBlockId: string | null;
}

export interface AgendaSnapshot {
  account: CalendarAccount;
  today: CalendarEvent[];
  upcoming: CalendarEvent[];
}

export type CalendarSyncPhase = 'idle' | 'syncing';

export interface CalendarPublicState {
  account: CalendarAccount;
  agenda: AgendaSnapshot | null;
  syncPhase: CalendarSyncPhase;
}

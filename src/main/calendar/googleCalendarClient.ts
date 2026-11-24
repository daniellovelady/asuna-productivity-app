export const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface EventsListFullParams {
  calendarId: string;
  timeMin: string;
  timeMax: string;
  pageToken?: string;
}

export interface EventsListIncrementalParams {
  calendarId: string;
  syncToken: string;
  pageToken?: string;
}

export function buildCalendarListUrl(pageToken?: string): string {
  const params = new URLSearchParams();
  if (pageToken) {
    params.set('pageToken', pageToken);
  }
  const query = params.toString();
  return `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList${query ? `?${query}` : ''}`;
}

export function buildEventsListFullUrl(params: EventsListFullParams): string {
  const search = new URLSearchParams();
  search.set('timeMin', params.timeMin);
  search.set('timeMax', params.timeMax);
  search.set('singleEvents', 'true');
  search.set('showDeleted', 'true');
  search.set('maxResults', '250');
  if (params.pageToken) {
    search.set('pageToken', params.pageToken);
  }
  const encodedCalendarId = encodeURIComponent(params.calendarId);
  return `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events?${search.toString()}`;
}

export function buildEventsListIncrementalUrl(params: EventsListIncrementalParams): string {
  const search = new URLSearchParams();
  search.set('syncToken', params.syncToken);
  if (params.pageToken) {
    search.set('pageToken', params.pageToken);
  }
  const encodedCalendarId = encodeURIComponent(params.calendarId);
  return `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events?${search.toString()}`;
}

export function incrementalUrlContainsForbiddenWindowParams(url: string): boolean {
  return url.includes('timeMin=') || url.includes('timeMax=');
}

export async function googleFetchJson(
  url: string,
  accessToken: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number }> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const data = (await response.json()) as Record<string, unknown>;
  return { ok: true, data };
}

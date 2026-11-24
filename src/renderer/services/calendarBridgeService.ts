import type {
  CalendarEvent,
  CalendarListEntry,
  CalendarPublicState,
} from '../../shared/calendar/types';

function getCalendarApi() {
  if (!window.calendarApi) {
    throw new Error('Calendar bridge is unavailable in this environment.');
  }
  return window.calendarApi;
}

export const calendarBridgeService = {
  getState: (): Promise<CalendarPublicState> => getCalendarApi().getState(),
  connect: (): Promise<CalendarPublicState> => getCalendarApi().connect(),
  disconnect: (): Promise<CalendarPublicState> => getCalendarApi().disconnect(),
  refresh: (): Promise<CalendarPublicState> => getCalendarApi().refresh(),
  getWorkspaceFeed: (
    rangeStart: string,
    rangeEnd: string,
  ): Promise<{ events: CalendarEvent[]; calendarList: CalendarListEntry[] }> =>
    getCalendarApi().getWorkspaceFeed({ rangeStart, rangeEnd }),
  startFocusFromEvent: (calendarId: string, externalEventId: string): Promise<{ ok: boolean }> =>
    getCalendarApi().startFocusFromEvent({ calendarId, externalEventId }),
  startFocusFromEventWithLink: (
    calendarId: string,
    externalEventId: string,
    linkedTaskId: string,
    linkedTaskTitleSnapshot: string,
  ): Promise<{ ok: boolean }> =>
    getCalendarApi().startFocusFromEventWithLink({
      calendarId,
      externalEventId,
      linkedTaskId,
      linkedTaskTitleSnapshot,
    }),
  hydrateLinks: (
    links: Array<{ externalCalendarId: string; externalEventId: string; taskId: string }>,
  ): Promise<CalendarPublicState> => getCalendarApi().hydrateLinks({ links }),
  onStateChanged: (callback: (state: CalendarPublicState) => void): (() => void) =>
    getCalendarApi().onStateChanged(callback),
};

declare global {
  interface Window {
    calendarApi: {
      getState: () => Promise<CalendarPublicState>;
      connect: () => Promise<CalendarPublicState>;
      disconnect: () => Promise<CalendarPublicState>;
      refresh: () => Promise<CalendarPublicState>;
      getWorkspaceFeed: (payload: {
        rangeStart: string;
        rangeEnd: string;
      }) => Promise<{ events: CalendarEvent[]; calendarList: CalendarListEntry[] }>;
      startFocusFromEvent: (payload: {
        calendarId: string;
        externalEventId: string;
      }) => Promise<{ ok: boolean }>;
      startFocusFromEventWithLink: (payload: {
        calendarId: string;
        externalEventId: string;
        linkedTaskId: string;
        linkedTaskTitleSnapshot: string;
      }) => Promise<{ ok: boolean }>;
      hydrateLinks: (payload: {
        links: Array<{ externalCalendarId: string; externalEventId: string; taskId: string }>;
      }) => Promise<CalendarPublicState>;
      onStateChanged: (callback: (state: CalendarPublicState) => void) => () => void;
    };
  }
}

export {};

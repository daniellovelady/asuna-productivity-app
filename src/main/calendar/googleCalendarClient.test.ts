import { describe, expect, it } from 'vitest';
import {
  buildEventsListFullUrl,
  buildEventsListIncrementalUrl,
  incrementalUrlContainsForbiddenWindowParams,
} from './googleCalendarClient';

describe('googleCalendarClient', () => {
  it('builds full sync URLs with time window parameters', () => {
    const url = buildEventsListFullUrl({
      calendarId: 'primary',
      timeMin: '2026-10-01T00:00:00.000Z',
      timeMax: '2026-10-15T23:59:59.999Z',
    });

    expect(url).toContain('timeMin=');
    expect(url).toContain('timeMax=');
    expect(url).toContain('singleEvents=true');
    expect(url).toContain('showDeleted=true');
  });

  it('builds incremental URLs without timeMin/timeMax', () => {
    const url = buildEventsListIncrementalUrl({
      calendarId: 'primary',
      syncToken: 'abc-sync',
    });

    expect(url).toContain('syncToken=abc-sync');
    expect(incrementalUrlContainsForbiddenWindowParams(url)).toBe(false);
  });

  it('never includes timeMin/timeMax on incremental pagination', () => {
    const url = buildEventsListIncrementalUrl({
      calendarId: 'primary',
      syncToken: 'abc-sync',
      pageToken: 'page-2',
    });

    expect(incrementalUrlContainsForbiddenWindowParams(url)).toBe(false);
  });
});

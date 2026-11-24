import { app, ipcMain } from 'electron';
import { diagLog } from '../diagnostics/mainDiagnosticsLog';
import { getAuthContextSnapshot } from '../auth/authContextSnapshot';
import { getCalendarService } from '../calendar/calendarService';
import { setPendingFocusStartIntent, tryStartFocus } from '../focus/focusStartCommand';

function assertActiveUser(): string {
  const userId = getAuthContextSnapshot().userId;
  if (!userId) {
    throw new Error('Sign-in context is not ready.');
  }
  return userId;
}

function isEventIdentityPayload(value: unknown): value is {
  calendarId: string;
  externalEventId: string;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.calendarId === 'string'
    && record.calendarId.length > 0
    && record.calendarId.length <= 512
    && typeof record.externalEventId === 'string'
    && record.externalEventId.length > 0
    && record.externalEventId.length <= 512;
}

function isHydrateLinksPayload(value: unknown): value is {
  links: Array<{
    externalCalendarId: string;
    externalEventId: string;
    taskId: string;
  }>;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.links)) {
    return false;
  }

  return record.links.every((link) => {
    if (typeof link !== 'object' || link === null) {
      return false;
    }
    const item = link as Record<string, unknown>;
    return typeof item.externalCalendarId === 'string'
      && typeof item.externalEventId === 'string'
      && typeof item.taskId === 'string';
  });
}

export function registerCalendarHandlers(): void {
  const service = getCalendarService();

  ipcMain.handle('calendar:getState', () => {
    assertActiveUser();
    return service.getPublicState();
  });

  ipcMain.handle('calendar:getWorkspaceFeed', async (_event, payload: unknown) => {
    assertActiveUser();

    if (
      typeof payload !== 'object'
      || payload === null
      || typeof (payload as { rangeStart?: unknown }).rangeStart !== 'string'
      || typeof (payload as { rangeEnd?: unknown }).rangeEnd !== 'string'
    ) {
      throw new Error('Invalid calendar workspace feed payload.');
    }

    const { rangeStart, rangeEnd } = payload as { rangeStart: string; rangeEnd: string };
    const feed = await service.loadWorkspaceFeed(rangeStart, rangeEnd);
    if (!app.isPackaged) {
      const cache = service.getGoogleCacheDiagnostics();
      diagLog('calendar-memory', 'google-range-fetch-complete', {
        visibleStart: rangeStart,
        visibleEnd: rangeEnd,
        returnedGoogleEventCount: feed.events.length,
        ...cache,
      });
    }
    return feed;
  });

  ipcMain.handle('calendar:connect', async () => {
    assertActiveUser();
    await service.startConnect();
    return service.getPublicState();
  });

  ipcMain.handle('calendar:disconnect', async () => {
    assertActiveUser();
    await service.disconnect();
    return service.getPublicState();
  });

  ipcMain.handle('calendar:refresh', async () => {
    const userId = assertActiveUser();
    await service.refresh(userId, 'manual');
    return service.getPublicState();
  });

  ipcMain.handle('calendar:startFocusFromEvent', (_event, payload: unknown) => {
    assertActiveUser();

    if (!isEventIdentityPayload(payload)) {
      throw new Error('Invalid calendar event payload.');
    }

    const intent = service.buildCalendarFocusIntent(
      payload.calendarId,
      payload.externalEventId,
      null,
      null,
    );

    if (!intent) {
      throw new Error('Event is not available. Refresh your agenda and try again.');
    }

    setPendingFocusStartIntent(intent);
    const result = tryStartFocus(intent);
    if (!result.ok) {
      throw new Error(result.reason);
    }
    return { ok: true, state: result.state };
  });

  ipcMain.handle('calendar:startFocusFromEventWithLink', (_event, payload: unknown) => {
    assertActiveUser();

    if (
      typeof payload !== 'object'
      || payload === null
      || !isEventIdentityPayload(payload)
    ) {
      throw new Error('Invalid calendar event payload.');
    }

    const record = payload as Record<string, unknown>;
    const linkedTaskId = typeof record.linkedTaskId === 'string' ? record.linkedTaskId : null;
    const linkedTaskTitleSnapshot = typeof record.linkedTaskTitleSnapshot === 'string'
      ? record.linkedTaskTitleSnapshot
      : null;

    const intent = service.buildCalendarFocusIntent(
      payload.calendarId,
      payload.externalEventId,
      linkedTaskId,
      linkedTaskTitleSnapshot,
    );

    if (!intent) {
      throw new Error('Event is not available. Refresh your agenda and try again.');
    }

    const result = tryStartFocus(intent);
    if (!result.ok) {
      throw new Error(result.reason);
    }

    return { ok: true, state: result.state };
  });

  ipcMain.handle('calendar:hydrateLinks', (_event, payload: unknown) => {
    assertActiveUser();

    if (!isHydrateLinksPayload(payload)) {
      throw new Error('Invalid calendar links payload.');
    }

    service.hydrateLinkedTasks(payload.links.map((link) => ({
      externalCalendarId: link.externalCalendarId,
      externalEventId: link.externalEventId,
      taskId: link.taskId,
    })));

    return service.getPublicState();
  });
}

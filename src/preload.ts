import { contextBridge, ipcRenderer } from 'electron';
import type {
  ActivitySamplePayload,
  ActivityTrackingState,
  AssistantQueueState,
  BufferedActivitySample,
} from './shared/activity/types';
import type {
  CoachAnalyzeRequest,
  CoachAnalyzeResponse,
} from './renderer/types/coachApi';
import type {
  VaryMessageRequest,
  VaryMessageResponse,
  WeeklyInsightReportResponse,
} from './renderer/types/weeklyInsight';
import type {
  NotificationAction,
  NotificationActionResult,
  VariationRequestPayload,
} from './shared/notifications/types';
import type { CalendarPublicState } from './shared/calendar/types';
import type { UserPreferences } from './shared/preferences/types';
import type { BreakEngineState } from './shared/focus/breakTypes';
import type {
  CompletedFocusSession,
  FocusEngineState,
} from './shared/focus/types';
import { captureRendererMemoryDetail } from './preload/diagnostics/captureRendererMemoryDetail';
import {
  isRendererMemoryDetailEnabled,
  RENDERER_MEMORY_DETAIL_IPC_CHANNEL,
} from './shared/diagnostics/rendererMemoryDetail';

ipcRenderer.on(RENDERER_MEMORY_DETAIL_IPC_CHANNEL, (_event, reason: unknown) => {
  if (!isRendererMemoryDetailEnabled()) {
    return;
  }
  const label = typeof reason === 'string' && reason.length > 0 ? reason : 'ipc-request';
  void captureRendererMemoryDetail(label)
    .then((detail) => {
      if (!detail) {
        return ipcRenderer.invoke('diagnostics:rendererMemoryDetailSampleFinished');
      }
      return ipcRenderer.invoke('diagnostics:reportRendererMemoryDetail', detail);
    })
    .catch(() => ipcRenderer.invoke('diagnostics:rendererMemoryDetailSampleFinished'));
});

const FORBIDDEN_SAMPLE_KEYS = new Set([
  'user_id',
  'userId',
  'title',
  'url',
  'path',
  'owner',
]);

function isActivitySamplePayload(value: unknown): value is ActivitySamplePayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_SAMPLE_KEYS.has(key)) {
      return false;
    }
  }

  return typeof payload.recordedAt === 'string'
    && typeof payload.applicationName === 'string'
    && typeof payload.idleSeconds === 'number'
    && typeof payload.classification === 'string'
    && (payload.sessionId === null || typeof payload.sessionId === 'string');
}

const breakApi = {
  getState: (): Promise<BreakEngineState> => ipcRenderer.invoke('break:getState'),
  endEarly: (): Promise<BreakEngineState> => ipcRenderer.invoke('break:endEarly'),
};

const focusApi = {
  getState: (): Promise<FocusEngineState> => ipcRenderer.invoke('focus:getState'),
  setDuration: (minutes: number): Promise<FocusEngineState> =>
    ipcRenderer.invoke('focus:setDuration', { minutes }),
  start: (task?: { taskId: string; titleSnapshot: string }): Promise<FocusEngineState> =>
    ipcRenderer.invoke('focus:start', task ?? null),
  pause: (): Promise<FocusEngineState> => ipcRenderer.invoke('focus:pause'),
  resume: (): Promise<FocusEngineState> => ipcRenderer.invoke('focus:resume'),
  stop: (): Promise<{ state: FocusEngineState; completed: CompletedFocusSession }> =>
    ipcRenderer.invoke('focus:stop'),
  acknowledgeCompletion: (sessionId: string): Promise<FocusEngineState> =>
    ipcRenderer.invoke('focus:acknowledgeCompletion', { sessionId }),
};

const activityApi = {
  getState: (): Promise<ActivityTrackingState> => ipcRenderer.invoke('activity:getState'),
  enable: (): Promise<ActivityTrackingState> => ipcRenderer.invoke('activity:enable'),
  disable: (): Promise<ActivityTrackingState> => ipcRenderer.invoke('activity:disable'),
  pause: (): Promise<ActivityTrackingState> => ipcRenderer.invoke('activity:pause'),
  resume: (): Promise<ActivityTrackingState> => ipcRenderer.invoke('activity:resume'),
  updateTriggerContext: (activeTaskCount: number): Promise<void> =>
    ipcRenderer.invoke('activity:updateTriggerContext', { activeTaskCount }),
  getBufferedSessionSamples: (sessionId: string): Promise<BufferedActivitySample[]> =>
    ipcRenderer.invoke('activity:getBufferedSessionSamples', { sessionId }),
  acknowledgeSessionSamplesPersisted: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('activity:acknowledgeSessionSamplesPersisted', { sessionId }),
  dismissAssistantMessage: (messageId: string): Promise<AssistantQueueState> =>
    ipcRenderer.invoke('activity:dismissAssistantMessage', { messageId }),
  onStateChanged: (callback: (state: ActivityTrackingState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: ActivityTrackingState) => {
      callback(state);
    };

    ipcRenderer.on('activity:stateChanged', listener);
    return () => {
      ipcRenderer.removeListener('activity:stateChanged', listener);
    };
  },
  onPersistCandidate: (callback: (payload: ActivitySamplePayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      if (isActivitySamplePayload(payload)) {
        callback(payload);
      }
    };

    ipcRenderer.on('activity:persistCandidate', listener);
    return () => {
      ipcRenderer.removeListener('activity:persistCandidate', listener);
    };
  },
  onAssistantQueueChanged: (callback: (state: AssistantQueueState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: AssistantQueueState) => {
      callback(state);
    };

    ipcRenderer.on('activity:assistantQueueChanged', listener);
    return () => {
      ipcRenderer.removeListener('activity:assistantQueueChanged', listener);
    };
  },
};

function isCoachAnalyzeRequest(value: unknown): value is CoachAnalyzeRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const allowedKeys = new Set(['accessToken', 'question', 'conversationId']);
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  return typeof payload.accessToken === 'string'
    && payload.accessToken.length > 0
    && payload.accessToken.length <= 8192
    && typeof payload.question === 'string'
    && payload.question.length > 0
    && payload.question.length <= 2000
    && (payload.conversationId === undefined || typeof payload.conversationId === 'string');
}

const coachApi = {
  analyze: (request: CoachAnalyzeRequest): Promise<CoachAnalyzeResponse> => {
    if (!isCoachAnalyzeRequest(request)) {
      return Promise.reject(new Error('Invalid coach analyze request.'));
    }
    return ipcRenderer.invoke('coach:analyze', request);
  },
  weeklyReport: (request: { accessToken: string }): Promise<WeeklyInsightReportResponse> => {
    if (
      typeof request !== 'object'
      || request === null
      || typeof request.accessToken !== 'string'
      || request.accessToken.length === 0
    ) {
      return Promise.reject(new Error('Invalid weekly report request.'));
    }
    return ipcRenderer.invoke('coach:weeklyReport', request);
  },
  varyMessage: (request: VaryMessageRequest): Promise<VaryMessageResponse> => {
    if (
      typeof request !== 'object'
      || request === null
      || typeof request.accessToken !== 'string'
      || typeof request.triggerKey !== 'string'
      || typeof request.tone !== 'string'
      || typeof request.template !== 'string'
    ) {
      return Promise.reject(new Error('Invalid vary message request.'));
    }
    return ipcRenderer.invoke('coach:varyMessage', request);
  },
};

const authContextApi = {
  registerRenderer: (): Promise<{ generation: number }> =>
    ipcRenderer.invoke('auth:registerRenderer'),
  setContext: (payload: {
    userId: string | null;
    sequence: number;
    generation: number;
    timeZone: string;
  }): Promise<{ applied: boolean }> => ipcRenderer.invoke('auth:setContext', payload),
};

const notificationBridgeApi = {
  executeAction: (
    notificationId: string,
    action: NotificationAction,
  ): Promise<NotificationActionResult> =>
    ipcRenderer.invoke('notification:action', { notificationId, action }),
  onVariationRequest: (callback: (payload: VariationRequestPayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: VariationRequestPayload) => {
      callback(payload);
    };
    ipcRenderer.on('notification:variationRequest', listener);
    return () => {
      ipcRenderer.removeListener('notification:variationRequest', listener);
    };
  },
  applyVariation: (payload: {
    notificationId: string;
    variationGeneration: number;
    variedTemplate: string;
  }): Promise<{ applied: boolean }> => ipcRenderer.invoke('notification:applyVariation', payload),
};

const preferencesApi = {
  sync: (payload: {
    userId: string;
    sequence: number;
    preferences: UserPreferences;
  }): Promise<{ applied: boolean }> => ipcRenderer.invoke('preferences:sync', payload),
  reset: (payload: { sequence: number }): Promise<void> =>
    ipcRenderer.invoke('preferences:reset', payload),
  getSnapshot: (): Promise<{
    userId: string | null;
    sequence: number;
    preferences: UserPreferences;
  }> => ipcRenderer.invoke('preferences:getSnapshot'),
};

const calendarApi = {
  getState: (): Promise<CalendarPublicState> => ipcRenderer.invoke('calendar:getState'),
  connect: (): Promise<CalendarPublicState> => ipcRenderer.invoke('calendar:connect'),
  disconnect: (): Promise<CalendarPublicState> => ipcRenderer.invoke('calendar:disconnect'),
  refresh: (): Promise<CalendarPublicState> => ipcRenderer.invoke('calendar:refresh'),
  getWorkspaceFeed: (payload: {
    rangeStart: string;
    rangeEnd: string;
  }): Promise<{
    events: import('./shared/calendar/types').CalendarEvent[];
    calendarList: import('./shared/calendar/types').CalendarListEntry[];
  }> => ipcRenderer.invoke('calendar:getWorkspaceFeed', payload),
  startFocusFromEvent: (payload: {
    calendarId: string;
    externalEventId: string;
  }): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('calendar:startFocusFromEvent', payload),
  startFocusFromEventWithLink: (payload: {
    calendarId: string;
    externalEventId: string;
    linkedTaskId: string;
    linkedTaskTitleSnapshot: string;
  }): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('calendar:startFocusFromEventWithLink', payload),
  hydrateLinks: (payload: {
    links: Array<{ externalCalendarId: string; externalEventId: string; taskId: string }>;
  }): Promise<CalendarPublicState> => ipcRenderer.invoke('calendar:hydrateLinks', payload),
  onStateChanged: (callback: (state: CalendarPublicState) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: CalendarPublicState) => {
      callback(state);
    };
    ipcRenderer.on('calendar:stateChanged', listener);
    return () => {
      ipcRenderer.removeListener('calendar:stateChanged', listener);
    };
  },
};

contextBridge.exposeInMainWorld('breakApi', breakApi);
contextBridge.exposeInMainWorld('focusApi', focusApi);
contextBridge.exposeInMainWorld('activityApi', activityApi);
contextBridge.exposeInMainWorld('authContextApi', authContextApi);
contextBridge.exposeInMainWorld('coachApi', coachApi);
contextBridge.exposeInMainWorld('preferencesApi', preferencesApi);
contextBridge.exposeInMainWorld('notificationBridgeApi', notificationBridgeApi);

const diagnosticsApi = {
  requestMemorySnapshot: (reason: string): Promise<boolean> =>
    ipcRenderer.invoke('diagnostics:requestMemorySnapshot', reason),
  reportCalendarMemory: (payload: Record<string, unknown>): Promise<boolean> =>
    ipcRenderer.invoke('diagnostics:reportCalendarMemory', payload),
  reportCalendarLifecycle: (stage: string): Promise<boolean> =>
    ipcRenderer.invoke('diagnostics:reportCalendarLifecycle', stage),
  readRendererMemoryDetail: (reason: string) => captureRendererMemoryDetail(reason),
  reportRendererMemoryDetail: async (reason: string): Promise<boolean> => {
    if (!isRendererMemoryDetailEnabled()) {
      return true;
    }
    const detail = await captureRendererMemoryDetail(reason);
    if (!detail) {
      return false;
    }
    return ipcRenderer.invoke('diagnostics:reportRendererMemoryDetail', detail);
  },
  takeRendererHeapSnapshot: (label: string): Promise<string | null> =>
    ipcRenderer.invoke('diagnostics:takeRendererHeapSnapshot', label),
};

contextBridge.exposeInMainWorld('calendarApi', calendarApi);
contextBridge.exposeInMainWorld('diagnosticsApi', diagnosticsApi);

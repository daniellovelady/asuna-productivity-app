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
  CompletedFocusSession,
  FocusEngineState,
} from './shared/focus/types';

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

const focusApi = {
  getState: (): Promise<FocusEngineState> => ipcRenderer.invoke('focus:getState'),
  setDuration: (minutes: number): Promise<FocusEngineState> =>
    ipcRenderer.invoke('focus:setDuration', { minutes }),
  start: (): Promise<FocusEngineState> => ipcRenderer.invoke('focus:start'),
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
  setAuthContext: (userId: string | null): Promise<ActivityTrackingState> =>
    ipcRenderer.invoke('activity:setAuthContext', { userId }),
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
};

contextBridge.exposeInMainWorld('focusApi', focusApi);
contextBridge.exposeInMainWorld('activityApi', activityApi);
contextBridge.exposeInMainWorld('coachApi', coachApi);

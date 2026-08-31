import { ipcMain, type WebContents } from 'electron';
import { getActivityTracker } from '../activity/activityTracker';
import { ActivityTrackerError } from '../../shared/activity/types';
import type {
  ActivitySamplePayload,
  ActivityTrackingState,
  AssistantQueueState,
} from '../../shared/activity/types';

let mainWebContents: WebContents | null = null;

function handleActivityError(error: unknown): never {
  if (error instanceof ActivityTrackerError) {
    throw new Error(error.message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('Unexpected activity tracker error.');
}

function isActivitySamplePayload(value: unknown): value is ActivitySamplePayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.recordedAt === 'string'
    && typeof payload.applicationName === 'string'
    && typeof payload.idleSeconds === 'number'
    && typeof payload.classification === 'string'
    && (payload.sessionId === null || typeof payload.sessionId === 'string')
    && !('user_id' in payload)
    && !('title' in payload);
}

export function setActivityWebContents(contents: WebContents | null): void {
  mainWebContents = contents;
}

export function registerActivityHandlers(): void {
  const tracker = getActivityTracker();

  tracker.setCallbacks({
    onStateChanged: (state: ActivityTrackingState) => {
      mainWebContents?.send('activity:stateChanged', state);
    },
    onPersistCandidate: (payload: ActivitySamplePayload) => {
      if (!isActivitySamplePayload(payload)) {
        return;
      }

      mainWebContents?.send('activity:persistCandidate', payload);
    },
    onAssistantQueueChanged: (state: AssistantQueueState) => {
      mainWebContents?.send('activity:assistantQueueChanged', state);
    },
  });

  ipcMain.handle('activity:getState', () => {
    try {
      return getActivityTracker().getState();
    } catch (error) {
      handleActivityError(error);
    }
  });

  ipcMain.handle('activity:enable', () => {
    try {
      return getActivityTracker().enable();
    } catch (error) {
      handleActivityError(error);
    }
  });

  ipcMain.handle('activity:disable', () => {
    try {
      return getActivityTracker().disable();
    } catch (error) {
      handleActivityError(error);
    }
  });

  ipcMain.handle('activity:pause', () => {
    try {
      return getActivityTracker().pause();
    } catch (error) {
      handleActivityError(error);
    }
  });

  ipcMain.handle('activity:resume', () => {
    try {
      return getActivityTracker().resume();
    } catch (error) {
      handleActivityError(error);
    }
  });

  ipcMain.handle('activity:setAuthContext', (_event, payload: unknown) => {
    try {
      if (
        typeof payload !== 'object'
        || payload === null
        || !('userId' in payload)
        || (payload as { userId: unknown }).userId !== null
        && typeof (payload as { userId: unknown }).userId !== 'string'
      ) {
        throw new Error('Invalid auth context payload.');
      }

      return getActivityTracker().setAuthContext(
        (payload as { userId: string | null }).userId,
      );
    } catch (error) {
      handleActivityError(error);
    }
  });

  ipcMain.handle('activity:updateTriggerContext', (_event, payload: unknown) => {
    try {
      if (
        typeof payload !== 'object'
        || payload === null
        || !('activeTaskCount' in payload)
        || typeof (payload as { activeTaskCount: unknown }).activeTaskCount !== 'number'
      ) {
        throw new Error('Invalid trigger context payload.');
      }

      getActivityTracker().updateTriggerContext(
        (payload as { activeTaskCount: number }).activeTaskCount,
      );
    } catch (error) {
      handleActivityError(error);
    }
  });

  ipcMain.handle('activity:getBufferedSessionSamples', (_event, payload: unknown) => {
    try {
      if (
        typeof payload !== 'object'
        || payload === null
        || !('sessionId' in payload)
        || typeof (payload as { sessionId: unknown }).sessionId !== 'string'
      ) {
        throw new Error('Invalid buffered session samples payload.');
      }

      return getActivityTracker().getBufferedSessionSamples(
        (payload as { sessionId: string }).sessionId,
      );
    } catch (error) {
      handleActivityError(error);
    }
  });

  ipcMain.handle('activity:acknowledgeSessionSamplesPersisted', (_event, payload: unknown) => {
    try {
      if (
        typeof payload !== 'object'
        || payload === null
        || !('sessionId' in payload)
        || typeof (payload as { sessionId: unknown }).sessionId !== 'string'
      ) {
        throw new Error('Invalid acknowledge session samples payload.');
      }

      getActivityTracker().acknowledgeSessionSamplesPersisted(
        (payload as { sessionId: string }).sessionId,
      );
    } catch (error) {
      handleActivityError(error);
    }
  });

  ipcMain.handle('activity:dismissAssistantMessage', (_event, payload: unknown) => {
    try {
      if (
        typeof payload !== 'object'
        || payload === null
        || !('messageId' in payload)
        || typeof (payload as { messageId: unknown }).messageId !== 'string'
      ) {
        throw new Error('Invalid dismiss assistant message payload.');
      }

      return getActivityTracker().dismissAssistantMessage(
        (payload as { messageId: string }).messageId,
      );
    } catch (error) {
      handleActivityError(error);
    }
  });
}

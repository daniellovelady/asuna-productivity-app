import type { ActivityApi } from '../types/activityApi';

function getActivityApi(): ActivityApi {
  if (typeof window === 'undefined' || !window.activityApi) {
    throw new Error('Activity API is unavailable. Preload bridge is not configured.');
  }

  return window.activityApi;
}

export const activityService = {
  getState: () => getActivityApi().getState(),
  enable: () => getActivityApi().enable(),
  disable: () => getActivityApi().disable(),
  pause: () => getActivityApi().pause(),
  resume: () => getActivityApi().resume(),
  setAuthContext: (userId: string | null) => getActivityApi().setAuthContext(userId),
  updateTriggerContext: (activeTaskCount: number) =>
    getActivityApi().updateTriggerContext(activeTaskCount),
  getBufferedSessionSamples: (sessionId: string) =>
    getActivityApi().getBufferedSessionSamples(sessionId),
  acknowledgeSessionSamplesPersisted: (sessionId: string) =>
    getActivityApi().acknowledgeSessionSamplesPersisted(sessionId),
  dismissAssistantMessage: (messageId: string) =>
    getActivityApi().dismissAssistantMessage(messageId),
  onStateChanged: (callback: Parameters<ActivityApi['onStateChanged']>[0]) =>
    getActivityApi().onStateChanged(callback),
  onPersistCandidate: (callback: Parameters<ActivityApi['onPersistCandidate']>[0]) =>
    getActivityApi().onPersistCandidate(callback),
  onAssistantQueueChanged: (callback: Parameters<ActivityApi['onAssistantQueueChanged']>[0]) =>
    getActivityApi().onAssistantQueueChanged(callback),
};

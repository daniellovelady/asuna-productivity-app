import type { FocusApi } from '../types/focusApi';

function getFocusApi(): FocusApi {
  if (typeof window === 'undefined' || !window.focusApi) {
    throw new Error('Focus API is unavailable. Preload bridge is not configured.');
  }

  return window.focusApi;
}

export const focusSessionService = {
  getState: () => getFocusApi().getState(),
  setDuration: (minutes: number) => getFocusApi().setDuration(minutes),
  start: () => getFocusApi().start(),
  pause: () => getFocusApi().pause(),
  resume: () => getFocusApi().resume(),
  stop: () => getFocusApi().stop(),
};

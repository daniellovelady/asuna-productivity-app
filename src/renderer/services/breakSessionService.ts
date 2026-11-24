import type { BreakEngineState } from '../../shared/focus/breakTypes';

declare global {
  interface Window {
    breakApi: {
      getState: () => Promise<BreakEngineState>;
      endEarly: () => Promise<BreakEngineState>;
    };
  }
}

function getBreakApi() {
  if (window.breakApi === undefined) {
    throw new Error('Break API is unavailable.');
  }

  return window.breakApi;
}

export const breakSessionService = {
  getState: (): Promise<BreakEngineState> => getBreakApi().getState(),
  endEarly: (): Promise<BreakEngineState> => getBreakApi().endEarly(),
};

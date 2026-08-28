import type {
  CompletedFocusSession,
  FocusEngineState,
} from '../../shared/focus/types';

export interface FocusApi {
  getState: () => Promise<FocusEngineState>;
  setDuration: (minutes: number) => Promise<FocusEngineState>;
  start: () => Promise<FocusEngineState>;
  pause: () => Promise<FocusEngineState>;
  resume: () => Promise<FocusEngineState>;
  stop: () => Promise<{ state: FocusEngineState; completed: CompletedFocusSession }>;
}

declare global {
  interface Window {
    focusApi: FocusApi;
  }
}

export {};

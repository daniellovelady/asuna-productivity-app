import type { UserPreferences } from '../../shared/preferences/types';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';

function getPreferencesApi() {
  if (!window.preferencesApi) {
    throw new Error('Preferences bridge is unavailable in this environment.');
  }
  return window.preferencesApi;
}

export const preferencesBridgeService = {
  sync: async (
    userId: string,
    sequence: number,
    preferences: UserPreferences,
  ): Promise<{ applied: boolean }> => {
    return getPreferencesApi().sync({ userId, sequence, preferences });
  },

  reset: async (sequence: number): Promise<void> => {
    await getPreferencesApi().reset({ sequence });
  },

  getSnapshot: async (): Promise<{
    userId: string | null;
    sequence: number;
    preferences: UserPreferences;
  }> => {
    const snapshot = await getPreferencesApi().getSnapshot();
    return {
      userId: snapshot.userId,
      sequence: snapshot.sequence,
      preferences: snapshot.preferences ?? { ...DEFAULT_USER_PREFERENCES },
    };
  },
};

declare global {
  interface Window {
    preferencesApi: {
      sync: (payload: {
        userId: string;
        sequence: number;
        preferences: UserPreferences;
      }) => Promise<{ applied: boolean }>;
      reset: (payload: { sequence: number }) => Promise<void>;
      getSnapshot: () => Promise<{
        userId: string | null;
        sequence: number;
        preferences: UserPreferences;
      }>;
    };
  }
}

export {};

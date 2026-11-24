function getAuthContextApi() {
  if (!window.authContextApi) {
    throw new Error('Auth context bridge is unavailable in this environment.');
  }

  return window.authContextApi;
}

export const authContextBridgeService = {
  registerRenderer: async (): Promise<{ generation: number }> => {
    return getAuthContextApi().registerRenderer();
  },

  sync: async (
    userId: string | null,
    sequence: number,
    generation: number,
    timeZone: string,
  ): Promise<{ applied: boolean }> => {
    return getAuthContextApi().setContext({ userId, sequence, generation, timeZone });
  },
};

declare global {
  interface Window {
    authContextApi: {
      registerRenderer: () => Promise<{ generation: number }>;
      setContext: (payload: {
        userId: string | null;
        sequence: number;
        generation: number;
        timeZone: string;
      }) => Promise<{ applied: boolean }>;
    };
  }
}

export {};

import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const coachBackendUrl = env.COACH_BACKEND_URL ?? 'http://127.0.0.1:8000';
  const coachRequestTimeoutMs = env.COACH_REQUEST_TIMEOUT_MS ?? '60000';

  return {
    define: {
      'process.env.COACH_BACKEND_URL': JSON.stringify(coachBackendUrl),
      'process.env.COACH_REQUEST_TIMEOUT_MS': JSON.stringify(coachRequestTimeoutMs),
    },
    build: {
      rollupOptions: {
        external: ['get-windows'],
      },
    },
  };
});

import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const coachBackendUrl = env.COACH_BACKEND_URL ?? 'http://127.0.0.1:8000';
  const coachRequestTimeoutMs = env.COACH_REQUEST_TIMEOUT_MS ?? '60000';
  const googleOAuthClientId = env.GOOGLE_OAUTH_CLIENT_ID ?? '';
  const googleOAuthClientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET ?? '';

  return {
    define: {
      'process.env.COACH_BACKEND_URL': JSON.stringify(coachBackendUrl),
      'process.env.COACH_REQUEST_TIMEOUT_MS': JSON.stringify(coachRequestTimeoutMs),
      'process.env.GOOGLE_OAUTH_CLIENT_ID': JSON.stringify(googleOAuthClientId),
      'process.env.GOOGLE_OAUTH_CLIENT_SECRET': JSON.stringify(googleOAuthClientSecret),
    },
    build: {
      rollupOptions: {
        external: ['get-windows'],
      },
    },
  };
});

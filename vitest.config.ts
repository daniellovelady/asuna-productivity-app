import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    NOTIFICATION_WINDOW_VITE_DEV_SERVER_URL: undefined,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});

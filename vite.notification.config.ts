import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { applyNotificationCspToHtml } from './src/notification/notificationCsp';

export default defineConfig(({ command }) => ({
  root: path.resolve(__dirname, 'src/notification'),
  plugins: [
    react(),
    {
      name: 'notification-csp',
      transformIndexHtml(html) {
        return applyNotificationCspToHtml(html, command === 'serve');
      },
    },
  ],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'src/notification/index.html'),
    },
  },
}));

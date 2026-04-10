import react from '@vitejs/plugin-react';
import peggyLoader from 'vite-plugin-peggy-loader';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.web.test.(js|jsx|ts|tsx)'],
    maxWorkers: 2,
  },
  plugins: [react(), peggyLoader()],
});

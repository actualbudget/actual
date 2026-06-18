import react from '@vitejs/plugin-react';
import peggyLoader from 'vite-plugin-peggy-loader';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.web.test.(js|jsx|ts|tsx)'],
    maxWorkers: 2,
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: './test-results/junit-web.xml',
              suiteName: 'component-library (web)',
            },
          ],
        ]
      : ['default'],
  },
  plugins: [react(), peggyLoader()],
});

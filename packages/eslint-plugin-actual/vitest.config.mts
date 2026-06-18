import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.(js|ts)', '**/__tests__/*'],
    environment: 'node',
    maxWorkers: 1,
    isolate: false,
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: './test-results/junit.xml',
              suiteName: 'eslint-plugin-actual',
            },
          ],
        ]
      : ['default'],
  },
});

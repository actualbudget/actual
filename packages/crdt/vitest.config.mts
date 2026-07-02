import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.(js|ts)'],
    environment: 'node',
    maxWorkers: 1,
    isolate: false,
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            { outputFile: './test-results/junit.xml', suiteName: 'crdt' },
          ],
        ]
      : ['default'],
  },
});

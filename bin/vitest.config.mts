import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['__tests__/**/*.test.ts'],
    environment: 'node',
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            { outputFile: './test-results/junit.xml', suiteName: 'bin' },
          ],
        ]
      : ['default'],
  },
});

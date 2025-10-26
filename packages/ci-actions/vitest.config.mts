import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.(js|jsx|ts|tsx)'],
    environment: 'node',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});

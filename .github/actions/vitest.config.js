import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['.github/actions/**/*.test.js'],
    environment: 'node',
  },
});

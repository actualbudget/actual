import { defineConfig } from 'vitest/config';

import { peggyLoader } from './scripts/peggy.mts';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/platform/server/sqlite/index.test.ts',
      'src/platform/server/fs/index.test.ts',
    ],
    maxWorkers: 2,
  },
  plugins: [peggyLoader()],
});

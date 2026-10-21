import { peggyLoader } from '@actual-app/vite-plugin-peggy';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/platform/server/sqlite/index.test.ts',
      'src/platform/server/sqlite/engine.wasm.test.ts',
      'src/platform/server/sqlite/storage/*.test.ts',
      'src/platform/client/browser-preload/storage-backend.test.ts',
      'src/platform/client/browser-preload/worker-bridge.test.ts',
      'src/platform/server/fs/index.test.ts',
      'src/platform/server/fs/fs.web.test.ts',
      'src/platform/server/fs/memfs.test.ts',
    ],
    maxWorkers: 2,
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: './test-results/junit-web.xml',
              suiteName: 'loot-core (web)',
            },
          ],
        ]
      : ['default'],
  },
  plugins: [peggyLoader()],
});

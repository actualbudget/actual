import { peggyLoader } from '@actual-app/vite-plugin-peggy';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./src/mocks/setup.ts'],
    exclude: [
      'src/platform/server/sqlite/index.test.ts',
      'src/platform/server/sqlite/storage/*.test.ts',
      'src/platform/client/browser-preload/storage-backend.test.ts',
      'src/platform/client/browser-preload/worker-bridge.test.ts',
      'src/platform/server/fs/fs.web.test.ts',
      'src/platform/server/fs/memfs.test.ts',
      'node_modules',
    ],
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      // print only console.error
      return type === 'stderr';
    },
    maxWorkers: 2,
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: './test-results/junit-node.xml',
              suiteName: 'loot-core (node)',
            },
          ],
        ]
      : ['default'],
  },
  ssr: {
    resolve: { conditions: ['electron', 'module', 'node', 'development'] },
  },
  resolve: {
    conditions: ['electron', 'module', 'browser', 'development'],
  },
  plugins: [peggyLoader()],
});

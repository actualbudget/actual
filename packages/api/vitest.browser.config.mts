import path from 'path';

import { defineConfig } from 'vite';
import peggyLoader from 'vite-plugin-peggy-loader';

// Deliberately independent from vite.browser.config.mts: the build config
// applies node polyfills that would swap out Node fs in the test setup
// file. The test setup uses real Node fs to stream the on-disk fixtures
// (default-db.sqlite, migrations, sql.js WASM) through a fetch polyfill.

export default defineConfig({
  plugins: [peggyLoader()],
  // No `api` resolve condition — loot-core falls back to its browser
  // platform files (sql.js / absurd-sql / IndexedDB), matching the build.
  resolve: {
    alias: {
      // Rewrite the shared spec's `../index` import to the browser entry.
      [path.resolve(__dirname, 'index.ts')]: path.resolve(
        __dirname,
        'index.browser.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.browser.ts'],
    include: ['test/integration.test.ts'],
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      return type === 'stderr';
    },
    maxWorkers: 2,
  },
});

import path from 'path';

import { defineConfig } from 'vite';
import peggyLoader from 'vite-plugin-peggy-loader';

// Deliberately independent from vite.browser.config.mts: the build config
// applies node polyfills that would swap out Node fs in the test setup
// file. The test setup uses real Node fs to stream the on-disk fixtures
// (default-db.sqlite, migrations, sql.js WASM) through a fetch polyfill.

export default defineConfig({
  plugins: [peggyLoader()],
  // The facade test imports `../index.browser` directly and uses a mock
  // Worker. loot-core never loads on the main thread, so no platform
  // condition juggling is needed here. The sibling vite.browser.config.mts
  // aliases loot-core to the stub for the bundled facade; for the test we
  // mirror that so `methods.ts` resolves correctly.
  resolve: {
    alias: {
      '@actual-app/core/server/main': path.resolve(
        __dirname,
        'browser/lib-stub.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/browser-facade.test.ts'],
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      return type === 'stderr';
    },
    maxWorkers: 2,
  },
});

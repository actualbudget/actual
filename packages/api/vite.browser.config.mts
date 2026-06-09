import path from 'path';

import { defineConfig } from 'vite';

const distDir = path.resolve(__dirname, 'dist');

// Main-thread facade only. Tiny bundle: no loot-core, no sql.js, no absurd-sql.
// The worker is built separately by vite.browser-worker.config.mts. The
// consumer constructs the Worker (handling URL resolution through their own
// bundler) and hands it to init().
export default defineConfig({
  build: {
    target: 'esnext',
    outDir: distDir,
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'index.browser.ts'),
      formats: ['es'],
      fileName: () => 'browser.js',
    },
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
  resolve: {
    // oxlint-disable-next-line actual/enforce-boundaries -- methods.ts reads `lib.send` from loot-core's server/main; aliasing that external package to the main-thread stub keeps the full loot-core graph out of the facade bundle (no #subpath equivalent for an external package).
    alias: {
      '@actual-app/core/server/main': path.resolve(
        __dirname,
        'browser/lib-stub.ts',
      ),
    },
  },
});

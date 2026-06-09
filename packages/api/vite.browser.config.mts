import path from 'path';

import { defineConfig } from 'vite';

const distDir = path.resolve(__dirname, 'dist');

// Main-thread facade only. Small bundle: no sql.js, no absurd-sql, no
// loot-core backend. The worker is built separately by
// vite.browser-worker.config.mts.
//
// The `api-browser` resolve condition makes loot-core's `server/main` export
// resolve to its worker-routing `lib` (server/main.api-browser.ts) instead of
// the in-process Node backend, so methods.ts's `lib.send` goes over postMessage
// without pulling the full loot-core graph into this bundle.
export default defineConfig({
  define: {
    // loot-core's client connection reads `global.Actual.getServerSocket()`;
    // map the bare `global` reference onto `globalThis` (no node polyfills in
    // this facade bundle) so the shim set in index.browser.ts is visible.
    global: 'globalThis',
  },
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
    conditions: ['api-browser'],
  },
});

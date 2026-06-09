import path from 'path';

import { defineConfig } from 'vite';

const distDir = path.resolve(__dirname, 'dist');

// Main-thread facade only (no backend in this bundle). The `api-browser`
// condition resolves loot-core's server/main to its worker-routing `lib`, so
// methods.ts's `lib.send` crosses to the worker.
export default defineConfig({
  define: {
    // loot-core's client connection reads `global.Actual`; map bare `global` to
    // globalThis (no node polyfills here) so index.browser.ts's shim is visible.
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

import path from 'path';

import { peggyLoader } from '@actual-app/vite-plugin-peggy';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const distDir = path.resolve(__dirname, 'dist');

// Main-thread facade bundle. The worker (browser-worker.ts) is imported with
// `?worker&inline`, so Vite builds it as an IIFE sub-bundle and inlines it as a
// Blob URL inside browser.js — consumer bundlers never see a worker entry to
// re-bundle. The worker embeds its own runtime assets (wasm, default DB,
// migrations) via `?inline`/`?raw` imports. `nodePolyfills` sits at the top
// level so its node-stdlib aliases and (via our patch) its global-shim
// injection reach the worker sub-build.
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  assetsInclude: ['**/*.sqlite', '**/*.wasm'],
  plugins: [
    nodePolyfills({
      include: [
        'process',
        'buffer',
        'stream',
        'path',
        'crypto',
        'timers',
        'util',
        'zlib',
        'fs',
        'assert',
      ],
      globals: {
        process: true,
        Buffer: true,
        global: true,
      },
    }),
  ],
  worker: {
    format: 'iife',
    plugins: () => [peggyLoader()],
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
});

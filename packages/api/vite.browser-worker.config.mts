import path from 'path';

import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import peggyLoader from 'vite-plugin-peggy-loader';

const distDir = path.resolve(__dirname, 'dist');

// Worker bundle: contains the full loot-core + sql.js + absurd-sql stack.
// Runs inside a Web Worker where absurd-sql's Atomics.wait has the right
// thread context. Consumer spawns the worker with this file as the entry.
export default defineConfig({
  define: {
    'process.env.PUBLIC_URL': JSON.stringify('/'),
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.ACTUAL_DATA_DIR': 'undefined',
    'process.env.ACTUAL_SERVER_URL': 'undefined',
    'process.env.ACTUAL_DOCUMENT_DIR': JSON.stringify('/documents'),
  },
  build: {
    target: 'esnext',
    outDir: distDir,
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'browser-worker.ts'),
      formats: ['es'],
      fileName: () => 'worker.js',
    },
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
  plugins: [
    peggyLoader(),
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
  // Intentionally no resolve.conditions: ['api'] — loot-core falls back to
  // its default (browser) platform files.
});

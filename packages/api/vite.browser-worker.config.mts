import path from 'path';

import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import peggyLoader from 'vite-plugin-peggy-loader';

const distDir = path.resolve(__dirname, 'dist');
const lootCoreRoot = path.resolve(__dirname, '../loot-core');

// Worker bundle: contains the full loot-core + sql.js + absurd-sql stack.
// Runs inside a Web Worker where absurd-sql's Atomics.wait has the right
// thread context. Consumer spawns the worker with this file as the entry.
//
// The entry lives in loot-core (server/api-browser-worker.ts) — it's generic
// "loot-core as a browser npm package" plumbing, not api-specific. We point at
// the source directly (same as the migrations copy in vite.config.mts) so the
// build resolves loot-core's `#`-subpath imports against loot-core's own
// package.json.
export default defineConfig({
  define: {
    // NODE_ENV is read at build time by dead-code elimination paths and
    // must stay a literal. The others (PUBLIC_URL, DATA_DIR, SERVER_URL,
    // DOCUMENT_DIR) are set at runtime via the `api-browser/init` handler
    // which receives them from the main thread — so they stay as
    // `process.env.<name>` references and the nodePolyfills-provided
    // process shim serves as the backing store.
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    target: 'esnext',
    outDir: distDir,
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(lootCoreRoot, 'src/server/api-browser-worker.ts'),
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

import path from 'path';

import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import peggyLoader from 'vite-plugin-peggy-loader';

const distDir = path.resolve(__dirname, 'dist');
const lootCoreRoot = path.resolve(__dirname, '../loot-core');

// Worker bundle: full loot-core + sql.js + absurd-sql, run inside a Web Worker.
// The entry lives in loot-core (generic browser-package plumbing); pointing at
// the source directly lets the build resolve loot-core's `#`-subpath imports.
export default defineConfig({
  define: {
    // Runtime env (PUBLIC_URL etc.) comes from the api-browser/init handler via
    // the nodePolyfills process shim; only NODE_ENV must be a build literal.
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
  // No resolve.conditions: ['api'] — loot-core uses its default (browser) files.
});

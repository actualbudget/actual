import path from 'path';

import { peggyLoader } from '@actual-app/vite-plugin-peggy';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const distDir = path.resolve(__dirname, 'dist');

// Worker bundle: full loot-core + sql.js + absurd-sql.
export default defineConfig({
  define: {
    // Other env vars (PUBLIC_URL etc.) are set at runtime via the process shim.
    'process.env.NODE_ENV': JSON.stringify('production'),
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
  // No resolve.conditions: ['api'] — loot-core uses its default (browser) files.
});

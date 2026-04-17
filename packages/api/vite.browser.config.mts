import path from 'path';

import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import peggyLoader from 'vite-plugin-peggy-loader';

const distDir = path.resolve(__dirname, 'dist');

export default defineConfig({
  // loot-core's browser platform code reads process.env.PUBLIC_URL etc.
  // directly. Inline the values we care about; anything else falls back to
  // the `{}` inside the nodePolyfills process shim.
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
  // Intentionally no resolve.conditions: ['api'] — omitting it causes
  // loot-core's default (browser) platform files to be selected.
});

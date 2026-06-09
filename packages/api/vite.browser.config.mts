import path from 'path';

import { defineConfig } from 'vite';

const distDir = path.resolve(__dirname, 'dist');

// Main-thread facade only — methods.ts sends over loot-core's client
// connection, so the backend never enters this bundle.
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
});

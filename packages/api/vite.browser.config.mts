import path from 'path';

import { defineConfig } from 'vite';

const distDir = path.resolve(__dirname, 'dist');

// Main-thread facade bundle — the backend never enters it.
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

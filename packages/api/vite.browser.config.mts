import path from 'path';

import { defineConfig } from 'vite';
import peggyLoader from 'vite-plugin-peggy-loader';

const distDir = path.resolve(__dirname, 'dist');

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
  plugins: [peggyLoader()],
  // Intentionally no resolve.conditions: ['api'] — omitting it causes
  // loot-core's default (browser) platform files to be selected.
});

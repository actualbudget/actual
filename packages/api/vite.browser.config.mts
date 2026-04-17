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
  resolve: {
    alias: {
      // The shared integration spec imports '../index' (Node entry). Under
      // the browser test config we reroute it to the browser entry so the
      // same spec runs against the browser build's init/shutdown.
      [path.resolve(__dirname, 'index.ts')]: path.resolve(
        __dirname,
        'index.browser.ts',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.browser.ts'],
    include: ['test/integration.test.ts'],
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      return type === 'stderr';
    },
    maxWorkers: 2,
  },
});

import fs from 'fs';
import path from 'path';

import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const distDir = path.resolve(__dirname, 'dist');

// Inline the already-built worker (IIFE) into the facade as a string, so
// index.browser.ts can spawn it from a Blob URL. This keeps consumer bundlers
// from ever seeing a worker entry to re-bundle (the bug this build fixes). The
// worker is built immediately before this config in the package build script.
function inlineWorker(): Plugin {
  const id = 'virtual:actual-worker-code';
  const resolved = '\0' + id;
  return {
    name: 'actual-inline-worker',
    resolveId(source) {
      return source === id ? resolved : undefined;
    },
    load(thisId) {
      if (thisId !== resolved) return undefined;
      const workerPath = path.join(distDir, 'worker.js');
      if (!fs.existsSync(workerPath)) {
        throw new Error(
          `worker.js not found at ${workerPath}; build the worker (vite.browser-worker.config.mts) before browser.js`,
        );
      }
      const code = fs.readFileSync(workerPath, 'utf8');
      return `export default ${JSON.stringify(code)};`;
    },
  };
}

// Main-thread facade bundle — the backend never enters it.
export default defineConfig({
  plugins: [inlineWorker()],
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

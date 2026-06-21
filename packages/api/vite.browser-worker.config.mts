import path from 'path';

import { peggyLoader } from '@actual-app/vite-plugin-peggy';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import { collectEmbeddedAssets } from './scripts/embedded-assets.mjs';

const distDir = path.resolve(__dirname, 'dist');

// Inline the wasm + default-filesystem data into the worker so the browser
// build performs no PUBLIC_URL asset fetches and consumers serve no extra files.
function embeddedAssets(): Plugin {
  const id = 'virtual:actual-embedded-assets';
  const resolved = '\0' + id;
  return {
    name: 'actual-embedded-assets',
    resolveId(source) {
      return source === id ? resolved : undefined;
    },
    load(thisId) {
      if (thisId !== resolved) return undefined;
      const { wasm, dataFiles, index } = collectEmbeddedAssets();
      const filesB64 = Object.fromEntries(
        Object.entries(dataFiles).map(([k, buf]) => [
          k,
          (buf as Buffer).toString('base64'),
        ]),
      );
      return [
        `export const wasmBase64 = ${JSON.stringify((wasm as Buffer).toString('base64'))};`,
        `export const dataIndex = ${JSON.stringify(index)};`,
        `export const dataFiles = ${JSON.stringify(filesB64)};`,
      ].join('\n');
    },
  };
}

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
      // IIFE (classic worker) so browser.js can inline it as a Blob URL and
      // consumer bundlers never see a worker entry to re-bundle. Mirrors the
      // web app's `kcab.worker` and avoids module-worker-from-blob pitfalls.
      formats: ['iife'],
      name: 'ActualBrowserWorker',
      fileName: () => 'worker.js',
    },
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
  plugins: [
    embeddedAssets(),
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

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

// Main-thread facade bundle. The worker (browser-worker.ts) is imported with
// `?worker&inline`, so Vite builds it as an IIFE sub-bundle and inlines it as a
// Blob URL inside browser.js — consumer bundlers never see a worker entry to
// re-bundle. `nodePolyfills` sits at the top level so its node-stdlib aliases
// and (via our patch) its global-shim injection reach the worker sub-build.
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [
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
  worker: {
    format: 'iife',
    plugins: () => [embeddedAssets(), peggyLoader()],
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
});

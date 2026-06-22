import path from 'path';

import { peggyLoader } from '@actual-app/vite-plugin-peggy';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import { collectEmbeddedAssets } from './default-filesystem.mjs';

// Embed loot-core's default filesystem (wasm + default DB + migrations) into the
// browser worker as a virtual module, so the worker performs no PUBLIC_URL asset
// fetches. This keeps the AQL schema (compiled into this bundle) and its
// migrations co-versioned in a single content-hashed artifact, preventing the
// "no such column" errors that occur when a freshly-loaded bundle runs against
// stale, separately-cached migration files (issue #8290). loot-core owns the
// bytes and the wire format; this just inlines them.
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
      const { wasmBase64, dataFiles, index } = collectEmbeddedAssets();
      return [
        `export const wasmBase64 = ${JSON.stringify(wasmBase64)};`,
        `export const dataIndex = ${JSON.stringify(index)};`,
        `export const dataFiles = ${JSON.stringify(dataFiles)};`,
      ].join('\n');
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const outDir = path.resolve(__dirname, 'lib-dist/browser');

  return {
    mode,
    base: '/kcab/',
    build: {
      target: 'es2020',
      outDir,
      emptyOutDir: true,
      lib: {
        entry: path.resolve(__dirname, 'src/server/main.browser-worker.ts'),
        name: 'backend',
        formats: ['iife'],
        fileName: () =>
          isDev ? 'kcab.worker.dev.js' : `kcab.worker.[hash].js`,
      },
      rolldownOptions: {
        onwarn(warning, warn) {
          // Suppress sourcemap warnings from peggy-loader
          if (
            warning.plugin === 'peggy-loader' &&
            warning.message?.includes('Sourcemap')
          ) {
            return;
          }

          // Use default warning handler for other warnings
          warn(warning);
        },
        output: {
          // Users debug from raw stack traces, so compress and strip
          // whitespace but never mangle identifiers (overrides the
          // mangle: true that `minify: 'oxc'` implies).
          ...(!isDev && {
            minify: {
              compress: true,
              mangle: false,
              codegen: true,
            },
          }),
          chunkFileNames: isDev
            ? '[name].kcab.worker.dev.js'
            : '[id].[name].kcab.worker.[hash].js',
          format: 'iife',
          name: 'backend',
          globals: {
            buffer: 'Buffer',
            'process/browser': 'process',
          },
        },
        external: [],
      },
      sourcemap: true,
      minify: isDev ? false : 'oxc',
    },
    define: {
      'process.env': '{}',
      'process.env.IS_DEV': JSON.stringify(isDev),
      'process.env.PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL || '/'),
      'process.env.ACTUAL_DATA_DIR': JSON.stringify('/'),
      'process.env.ACTUAL_DOCUMENT_DIR': JSON.stringify('/documents'),
    },
    plugins: [
      embeddedAssets(),
      peggyLoader(),
      nodePolyfills({
        include: [
          'process',
          'stream',
          'path',
          'crypto',
          'timers',
          'util',
          'zlib',
          'fs',
          'assert',
          'buffer',
        ],
        globals: {
          process: true,
          global: true,
        },
      }),
      visualizer({ template: 'raw-data', filename: `${outDir}/stats.json` }),
    ],
    optimizeDeps: {
      include: [
        'buffer',
        'process',
        'assert',
        'crypto-browserify',
        'path-browserify',
        'stream-browserify',
        'timers-browserify',
        'util',
        'browserify-zlib',
      ],
    },
  };
});

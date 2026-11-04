import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'path';

import { peggyLoader } from '@actual-app/vite-plugin-peggy';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const require = createRequire(import.meta.url);
const sqliteWasmPath = require.resolve('@sqlite.org/sqlite-wasm/sqlite3.wasm');

// Library builds inline every imported asset, so the sqlite wasm is
// emitted as a sibling of the worker bundle instead. It is served from the
// same `kcab/` directory and precached with it; the engine fetches it from
// `kcab/sqlite3.wasm` (see src/platform/server/sqlite/engine.wasm.ts).
//
// The glue locates its wasm with `new URL('sqlite3.wasm', import.meta.url)`,
// which Vite would otherwise inline as a 1.2 MB base64 copy next to the
// emitted file. Rewriting `import.meta.url` before Vite's asset pass stops
// that; it is also what a classic worker loaded via importScripts needs,
// since Rolldown replaces `import.meta` with `{}` in IIFE output.
//
// The glue also spawns a worker for its deprecated "Worker1" API, which
// Vite bundles into a 1.3 MB `assets/sqlite3-worker1-*.js`. Nothing calls
// that API, so drop the chunk rather than ship and precache it.
function sqliteWasmAssets(): Plugin {
  return {
    name: 'sqlite-wasm-assets',
    enforce: 'pre',
    transform(code, id) {
      if (!/@sqlite\.org\/sqlite-wasm\//.test(id)) return undefined;
      return {
        code: code.replace(/\bimport\.meta\.url\b/g, 'self.location.href'),
        map: null,
      };
    },
    generateBundle(_options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (/(^|\/)sqlite3-worker1[^/]*\.js(\.map)?$/.test(fileName)) {
          delete bundle[fileName];
        }
      }
      this.emitFile({
        type: 'asset',
        fileName: 'sqlite3.wasm',
        source: readFileSync(sqliteWasmPath),
      });
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
        entry: path.resolve(__dirname, 'src/server/main.ts'),
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
      peggyLoader(),
      sqliteWasmAssets(),
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

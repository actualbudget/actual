import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import peggyLoader from 'vite-plugin-peggy-loader';

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
      minify: isDev ? false : 'terser',
      terserOptions: {
        compress: {
          drop_debugger: false,
        },
        mangle: false,
      },
    },
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.json'],
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

import path from 'path';

import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import { vitePeggyPlugin } from './vite-peggy-plugin';

// Browser/webworker configuration
// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    mode,
    base: '/kcab/',
    build: {
      target: 'es2020',
      outDir: path.resolve(__dirname, 'lib-dist/browser'),
      emptyOutDir: true,
      lib: {
        entry: path.resolve(__dirname, 'src/server/main.ts'),
        name: 'backend',
        formats: ['iife'],
        fileName: () =>
          isDev ? 'kcab.worker.dev.js' : `kcab.worker.[hash].js`,
      },
      rollupOptions: {
        output: {
          chunkFileNames: isDev
            ? '[name].kcab.worker.dev.js'
            : '[id].[name].kcab.worker.[hash].js',
          format: 'umd',
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
      extensions: [
        '.web.js',
        '.web.ts',
        '.web.tsx',
        '.js',
        '.ts',
        '.tsx',
        '.json',
      ],
      alias: [
        // Node.js polyfills
        // { find: 'assert', replacement: 'assert' },
        // { find: 'buffer', replacement: 'buffer' },
        // { find: 'path', replacement: 'path-browserify' },
        // { find: 'process', replacement: 'process/browser' },
        // { find: 'stream', replacement: 'stream-browserify' },
        // { find: 'zlib', replacement: 'browserify-zlib' },
        // { find: 'fs', replacement: 'memfs' },
        // // Workspace packages
        // {
        //   find: '@actual-app/crdt',
        //   replacement: path.resolve(__dirname, '../crdt/src/index.ts'),
        // },
        {
          find: /^@actual-app\/crdt(\/.*)?$/,
          replacement: path.resolve('../../crdt/src$1'),
        },
      ],
    },
    define: {
      'process.env': '{}',
      'process.env.IS_DEV': JSON.stringify(isDev),
      'process.env.PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL || '/'),
      'process.env.ACTUAL_DATA_DIR': JSON.stringify('/'),
      'process.env.ACTUAL_DOCUMENT_DIR': JSON.stringify('/documents'),
      global: 'globalThis',
      Buffer: 'globalThis.Buffer',
      process: 'globalThis.process',
    },
    plugins: [
      vitePeggyPlugin(),
      viteCommonjs(),
      nodePolyfills({ exclude: ['buffer'] }),
    ],
    optimizeDeps: {
      include: [
        'buffer',
        'process',
        'assert',
        'path-browserify',
        'stream-browserify',
        'browserify-zlib',
        'memfs',
      ],
    },
  };
});

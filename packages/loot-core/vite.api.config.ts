import path from 'path';

import { defineConfig } from 'vite';

import { vitePeggyPlugin } from './vite-peggy-plugin';

// eslint-disable-next-line import/no-default-export
export default defineConfig(({ mode }) => {
  return {
    mode,
    build: {
      target: 'node18',
      outDir: path.resolve(__dirname, '../../api/app'),
      emptyOutDir: false,
      ssr: true,
      lib: {
        entry: path.resolve(__dirname, 'src/server/main.ts'),
        formats: ['cjs'],
        fileName: () => 'bundle.api.js',
      },
      sourcemap: true,
      rollupOptions: {
        external: ['better-sqlite3'],
      },
    },
    resolve: {
      extensions: [
        '.api.js',
        '.api.ts',
        '.api.tsx',
        '.electron.js',
        '.electron.ts',
        '.electron.tsx',
        '.js',
        '.ts',
        '.tsx',
        '.json',
      ],
      alias: [
        { find: 'handlebars', replacement: 'handlebars/dist/handlebars.js' },
        {
          find: '@actual-app/crdt',
          replacement: path.resolve(__dirname, '../crdt/src/index.ts'),
        },
      ],
    },
    plugins: [vitePeggyPlugin()],
  };
});

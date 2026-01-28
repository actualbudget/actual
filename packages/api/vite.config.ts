import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import peggyLoader from 'vite-plugin-peggy-loader';

const crdtDir = path.resolve(__dirname, '../crdt');

export default defineConfig({
  ssr: { noExternal: true, external: ['better-sqlite3'] },
  build: {
    ssr: true,
    target: 'es2021',
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
  },
  plugins: [
    peggyLoader(),
    visualizer({ template: 'raw-data', filename: 'dist/stats.json' }),
  ],
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
      // {
      //   find: 'handlebars',
      //   replacement: require.resolve('handlebars/dist/handlebars.js'),
      // },
      {
        find: /^@actual-app\/crdt(\/.*)?$/,
        replacement: path.resolve(crdtDir, 'src') + '$1',
      },
    ],
  },
});

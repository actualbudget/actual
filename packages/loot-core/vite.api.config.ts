import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import peggyLoader from 'vite-plugin-peggy-loader';

export default defineConfig(({ mode }) => {
  const outDir = path.resolve(__dirname, '../api/app');
  const crdtDir = path.resolve(__dirname, '../crdt');

  return {
    mode,
    ssr: { noExternal: true, external: ['better-sqlite3'] },
    build: {
      target: 'node18',
      outDir,
      emptyOutDir: false,
      ssr: true,
      lib: {
        entry: path.resolve(__dirname, 'src/server/main.ts'),
        formats: ['cjs'],
      },
      sourcemap: true,
      rollupOptions: {
        output: {
          entryFileNames: 'bundle.api.js',
          format: 'cjs',
          name: 'api',
        },
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
        {
          find: 'handlebars',
          replacement: require.resolve('handlebars/dist/handlebars.js'),
        },
        {
          find: /^@actual-app\/crdt(\/.*)?$/,
          replacement: path.resolve(crdtDir, 'src') + '$1',
        },
      ],
    },
    plugins: [
      peggyLoader(),
      visualizer({ template: 'raw-data', filename: `${outDir}/stats.json` }),
    ],
  };
});

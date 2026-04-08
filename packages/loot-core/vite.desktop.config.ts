import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import peggyLoader from 'vite-plugin-peggy-loader';

export default defineConfig(({ mode }) => {
  const outDir = path.resolve(__dirname, 'lib-dist/electron');

  return {
    mode,
    ssr: {
      noExternal: true,
      external: ['better-sqlite3'],
      resolve: { conditions: ['electron'] },
    },
    build: {
      target: 'node18',
      outDir,
      emptyOutDir: true,
      ssr: true,
      lib: {
        entry: path.resolve(__dirname, 'src/server/main.ts'),
        formats: ['cjs'],
      },
      sourcemap: true,
      rolldownOptions: {
        output: {
          entryFileNames: 'bundle.desktop.js',
          format: 'cjs',
          name: 'desktop',
        },
      },
    },
    resolve: {
      conditions: ['electron'],
      extensions: [
        '.electron.js',
        '.electron.ts',
        '.electron.tsx',
        '.js',
        '.ts',
        '.tsx',
        '.json',
        '.pegjs',
      ],
      alias: [
        {
          find: 'handlebars',
          replacement: require.resolve('handlebars/dist/handlebars.js'),
        },
      ],
    },
    plugins: [
      peggyLoader(),
      visualizer({ template: 'raw-data', filename: `${outDir}/stats.json` }),
    ],
  };
});

import fs from 'fs';
import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
);

export default defineConfig({
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  ssr: { noExternal: true, external: ['@actual-app/api'] },
  build: {
    ssr: true,
    target: 'node22',
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'cli.js',
        banner: chunk => (chunk.isEntry ? '#!/usr/bin/env node' : ''),
      },
    },
  },
  plugins: [visualizer({ template: 'raw-data', filename: 'dist/stats.json' })],
  test: {
    globals: true,
  },
});

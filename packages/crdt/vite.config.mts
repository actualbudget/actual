import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
  ssr: {
    noExternal: true,
    external: ['google-protobuf', 'murmurhash'],
  },
  build: {
    ssr: true,
    target: 'node22',
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
  },
  plugins: [visualizer({ template: 'raw-data', filename: 'dist/stats.json' })],
});

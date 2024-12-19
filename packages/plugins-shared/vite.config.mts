import * as path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ insertTypesEntry: true, include: ['src'] })],
  build: {
    lib: {
      entry: path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        'src/index.ts',
      ),
      name: 'Shared',
      formats: ['es', 'cjs'],
      fileName: format => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@emotion/css'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});

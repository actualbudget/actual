import { resolve } from 'path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  resolve: {
    alias: {
      '@actual-app/shared-types': resolve(__dirname, '../shared-types/src'),
      '@actual-app/query': resolve(__dirname, '../query/src'),
      '@actual-app/components': resolve(__dirname, '../component-library/src'),
    },
  },
  build: {
    outDir: 'build',
    lib: {
      entry: {
        server: 'src/server.ts',
        client: 'src/client.ts',
      },
      name: '@actual-app/plugins-core',
      fileName: (format, entryName) =>
        format === 'es' ? `${entryName}.js` : `${entryName}.cjs`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'i18next',
        'react-i18next',
        'react-aria-components',
        '@emotion/css',
        'usehooks-ts',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          i18next: 'i18next',
        },
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'build',
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      rollupTypes: false,
      copyDtsFiles: false,
    }),
  ],
});

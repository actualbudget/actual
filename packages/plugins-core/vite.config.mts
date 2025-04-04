import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    outDir: 'build',
    lib: {
      entry: 'src/index.ts',
      name: '@actual-app/plugins-core',
      fileName: `index`,
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react'],
      output: {
        globals: {
          react: 'react',
        },
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'build',
      include: ['src/**/*.ts'],
      rollupTypes: true,
      copyDtsFiles: true,
    }),
  ],
});

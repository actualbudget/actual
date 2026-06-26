import path from 'path';

import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const outDir = path.resolve(__dirname, 'dist');

  return {
    mode,
    build: {
      target: 'es2020',
      outDir,
      emptyOutDir: true,
      lib: {
        entry: path.resolve(__dirname, 'src/plugin-service-worker.ts'),
        name: 'plugin_sw',
        formats: ['iife'],
        fileName: () => `plugin-sw.js`,
      },
      sourcemap: true,
      minify: false,
    },
    define: {
      'process.env': '{}',
      'process.env.IS_DEV': JSON.stringify(isDev),
    },
  };
});

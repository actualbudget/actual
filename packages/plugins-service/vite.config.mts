// @ts-strict-ignore
import path from 'path';

import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const outDir = path.resolve(__dirname, 'dist');
  const buildHash = Date.now().toString(36);

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
        fileName: () =>
          isDev ? `plugin-sw.dev.js` : `plugin-sw.${buildHash}.js`,
      },
      sourcemap: true,
      minify: isDev ? false : 'terser',
      terserOptions: {
        compress: {
          drop_debugger: false,
        },
        mangle: false,
      },
    },
    resolve: {
      extensions: ['.js', '.ts', '.json'],
    },
    define: {
      'process.env': '{}',
      'process.env.IS_DEV': JSON.stringify(isDev),
    },
  };
});

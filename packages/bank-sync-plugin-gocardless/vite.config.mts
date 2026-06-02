import path from 'path';
import { fileURLToPath } from 'url';

import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

import { manifest } from './src/manifest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@actual-app/plugins-core': path.resolve(
        repoRoot,
        'packages/plugins-core/src/client.ts',
      ),
    },
  },
  server: {
    origin: 'http://localhost:2003',
    port: 2003,
  },
  preview: {
    port: 2003,
    host: '0.0.0.0',
  },
  base: 'http://localhost:2003',
  build: {
    target: 'es2022',
    outDir: 'frontend-build',
    lib: {
      entry: path.resolve(__dirname, 'frontend/src/index.tsx'),
      name: manifest.name,
      fileName: format => `${manifest.name}.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      input: path.resolve(__dirname, 'frontend/src/index.tsx'),
      output: {
        globals: {},
      },
      external: [],
    },
  },
  ssr: {
    noExternal: [
      '@actual-app/plugins-core',
      '@actual-app/components',
      'react',
      'react-dom',
    ],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV || 'production',
    ),
  },
  plugins: [
    federation({
      name: manifest.name,
      ignoreOrigin: true,
      manifest: true,
      dev: {
        disableDynamicRemoteTypeHints: true,
        remoteHmr: true,
      },
      exposes: {
        '.': './frontend/src/index.tsx',
      },
      shared: {
        'react-i18next': {
          singleton: true,
        },
        i18next: {
          singleton: true,
        },
      },
    }),
    react({ reactRefreshHost: 'http://localhost:2003' }),
  ],
});

import path from 'path';

import react from '@vitejs/plugin-react';
import peggyLoader from 'vite-plugin-peggy-loader';
import { defineConfig } from 'vitest/config';

const resolveExtensions = [
  '.testing.ts',
  '.mjs',
  '.js',
  '.mts',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
  '.wasm',
];

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.web.test.(js|jsx|ts|tsx)'],
    maxWorkers: 2,
  },
  resolve: {
    extensions: resolveExtensions,
  },
  plugins: [react(), peggyLoader()],
});

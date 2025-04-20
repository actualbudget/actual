import path from 'path';

import peggyLoader from 'vite-plugin-peggy-loader';
import { defineConfig } from 'vitest/config';

const resolveExtensions = [
  '.testing.ts',
  '.web.ts',
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
  },
  resolve: {
    alias: {
      '@actual-app/crdt': path.resolve('../crdt'),
    },
    extensions: resolveExtensions,
  },
  plugins: [peggyLoader()],
});

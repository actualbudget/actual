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
    include: [
      'src/platform/server/sqlite/index.test.ts',
      'src/platform/server/fs/index.test.ts',
    ],
    maxWorkers: 2,
  },
  resolve: {
    extensions: resolveExtensions,
  },
  plugins: [peggyLoader()],
});

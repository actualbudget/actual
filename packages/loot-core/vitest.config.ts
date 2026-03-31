import path from 'path';

import peggyLoader from 'vite-plugin-peggy-loader';
import { defineConfig } from 'vitest/config';

const resolveExtensions = [
  '.testing.ts',
  '.electron.ts',
  '.mjs',
  '.js',
  '.mts',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
];

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./src/mocks/setup.ts'],
    exclude: [
      'src/platform/server/sqlite/index.test.ts',
      'src/platform/server/fs/index.test.ts',
      'node_modules',
    ],
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      // print only console.error
      return type === 'stderr';
    },
    maxWorkers: 2,
  },
  resolve: {
    extensions: resolveExtensions,
  },
  plugins: [peggyLoader()],
});

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
    exclude: ['src/**/*.web.test.(js|jsx|ts|tsx)'],
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      // print only console.error
      return type === 'stderr';
    },
  },
  resolve: {
    alias: [
      {
        find: /^@actual-app\/crdt(\/.*)?$/,
        replacement: path.resolve('../crdt/src$1'),
      },
    ],
    extensions: resolveExtensions,
  },
  plugins: [peggyLoader()],
});

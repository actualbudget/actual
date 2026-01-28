import peggyLoader from 'vite-plugin-peggy-loader';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: [
      '.api.js',
      '.api.ts',
      '.api.tsx',
      '.electron.js',
      '.electron.ts',
      '.electron.tsx',
      '.js',
      '.ts',
      '.tsx',
      '.json',
    ],
  },
  plugins: [peggyLoader()],
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
      // print only console.error
      return type === 'stderr';
    },
    maxWorkers: 2,
  },
});

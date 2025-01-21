import path from 'path';
import peggyLoader from 'vite-plugin-peggy-loader';

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

export default {
  test: {
    globals: true,
    setupFiles: ['./src/mocks/setup.ts'],
    exclude: ['src/**/*.web.test.(js|jsx|ts|tsx)'],
  },
  resolve: {
    alias: {
      '@actual-app/crdt': path.resolve('../crdt'),
    },
    extensions: resolveExtensions,
  },
  plugins: [peggyLoader()],
};

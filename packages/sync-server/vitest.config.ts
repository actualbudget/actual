export default {
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    globalSetup: ['./vitest.globalSetup.js'],
    globals: true,
    coverage: {
      enabled: false,
    },
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
    },
  },
};

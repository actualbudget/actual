export default {
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    globalSetup: ['./vitest.globalSetup.js'],
    globals: true,
    coverage: {
      enabled: false,
    },
    maxWorkers: 2,
    // All test files share account.sqlite. Running files in parallel races on
    // the auth table's PRIMARY KEY (e.g. UNIQUE constraint failed: auth.method).
    fileParallelism: false,
  },
};

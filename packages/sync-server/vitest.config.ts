export default {
  test: {
    include: ['build/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**', 'src/**'],
    globalSetup: ['./vitest.globalSetup.js'],
    globals: true,
    coverage: {
      enabled: false,
    },
    maxWorkers: 2,
  },
};

import { defineConfig } from vitest/config;

export default defineConfig({
  test: {
    include: [tests/**/*.test.js],
    watch: false,
    reporters: [default],
    globals: true,
    environment: node,
    coverage: {
      enabled: true,
      provider: v8,
      reportsDirectory: ./coverage,
      reporter: [text, html],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  testDir: 'e2e/',
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    trace: 'on-first-retry',
  },
  projects: [
    {
      // Serves the prebuilt `dist` verbatim (loaded straight from node_modules
      // in dev), exercising the package exactly as published.
      name: 'verbatim-dist',
      testMatch: /browser\.test\.ts$/,
      use: { baseURL: 'http://localhost:4180' },
    },
    {
      // Runs a real `vite build` of a consumer app, the path that re-bundles the
      // worker if its reference isn't bundler-safe.
      name: 'bundled',
      testMatch: /bundled\.test\.ts$/,
      use: { baseURL: 'http://localhost:4181' },
    },
  ],
  webServer: [
    {
      command: 'node e2e/serve-dist.mjs',
      url: 'http://localhost:4180/e2e/harness.html',
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        'vite build --config e2e/bundled/vite.config.mts && vite preview --config e2e/bundled/vite.config.mts',
      url: 'http://localhost:4181/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

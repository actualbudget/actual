import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  testDir: 'e2e/',
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    baseURL: 'http://localhost:4180',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node e2e/serve-dist.mjs',
    url: 'http://localhost:4180/e2e/harness.html',
    reuseExistingServer: !process.env.CI,
  },
});

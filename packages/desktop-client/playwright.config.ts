import { defineConfig } from '@playwright/test';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  timeout: 60000, // 60 seconds
  retries: 1,
  workers: process.env.CI ? 1 : undefined,
  testDir: 'e2e/',
  reporter: process.env.CI ? 'blob' : [['html', { open: 'never' }]],
  webServer: {
    command: 'yarn --cwd ../.. start',
    url: process.env.E2E_START_URL ?? 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    userAgent: 'playwright',
    screenshot: 'on',
    browserName: 'chromium',
    baseURL: process.env.E2E_START_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  expect: {
    toHaveScreenshot: { maxDiffPixels: 5 },
  },
});

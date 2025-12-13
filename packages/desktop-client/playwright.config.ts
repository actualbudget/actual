import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60000, // 60 seconds
  retries: 1,
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  testDir: 'e2e/',
  reporter: process.env.CI ? 'blob' : [['html', { open: 'never' }]],
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

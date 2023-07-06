import { defineConfig } from '@playwright/test';

// eslint-disable-next-line import/no-unused-modules
export default defineConfig({
  timeout: 20000, // 20 seconds
  retries: process.env.CI ? 1 : 0,
  testDir: 'e2e/',
  use: {
    userAgent: 'playwright',
    screenshot: 'on',
    browserName: 'chromium',
    baseURL: process.env.E2E_START_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
  },
});

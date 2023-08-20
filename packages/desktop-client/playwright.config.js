import { expect, defineConfig } from '@playwright/test';

// Disable screenshot assertions in regular e2e tests;
// only enable them when doing VRT tests
if (!process.env.VRT) {
  expect.extend({
    toHaveScreenshot() {
      return {
        message: () => 'passed',
        pass: true,
      };
    },
  });
}

export default defineConfig({
  timeout: 20000, // 20 seconds
  retries: 1,
  testDir: 'e2e/',
  use: {
    screenshot: 'on',
    browserName: 'chromium',
    baseURL: process.env.E2E_START_URL ?? 'https://192.168.0.178:3001',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
});

import { defineConfig } from '@playwright/test';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  timeout: 45000, // 45 seconds
  retries: 1,
  testDir: 'e2e/',
  reporter: undefined,
  outputDir: 'e2e/test-results/',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    userAgent: 'playwright',
    screenshot: 'on',
    browserName: 'chromium',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  expect: {
    toHaveScreenshot: { maxDiffPixels: 5 },
  },
});

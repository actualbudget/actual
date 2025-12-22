import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60000, // 60 seconds
  retries: 1,
  testDir: 'e2e/',
  reporter: undefined,
  outputDir: 'e2e/test-results/',
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}',
  use: {
    userAgent: 'playwright',
    screenshot: 'on',
    browserName: 'chromium',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  expect: {
    toHaveScreenshot: { maxDiffPixels: 5 },
    timeout: 60000, // 60 seconds
  },
});

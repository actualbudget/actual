import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 120000, // 120 seconds (Tauri startup can be slower)
  retries: 1,
  testDir: 'e2e/',
  reporter: undefined,
  outputDir: 'e2e/test-results/',
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}',
  use: {
    screenshot: 'on',
    trace: 'on-first-retry',
  },
  expect: {
    timeout: 60000,
  },
});

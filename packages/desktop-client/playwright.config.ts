import path from 'node:path';

import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60000, // 60 seconds
  retries: 1,
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  testDir: 'e2e/',
  reporter: process.env.CI
    ? [['blob'], ['list']]
    : [['html', { open: 'never' }]],
  use: {
    userAgent: 'playwright',
    screenshot: 'only-on-failure',
    browserName: 'chromium',
    baseURL: process.env.E2E_START_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  expect: {
    // Default expect timeout (5s) is too tight for initial render of the
    // budget page in the production bundle under CI CPU contention —
    // the budget-table testid lives inside AutoSizer, which returns null
    // until layout provides width/height, and that can take >5s. Bumping
    // to 10s lets those assertions settle without per-test overrides.
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixels: 5 },
  },
  webServer: process.env.E2E_START_URL
    ? undefined
    : {
        cwd: path.join(__dirname, '..', '..'),
        command: process.env.E2E_USE_BUILD
          ? 'node packages/desktop-client/bin/serve-build.mjs'
          : 'yarn start',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
        ignoreHTTPSErrors: true,
        timeout: 120_000,
      },
});

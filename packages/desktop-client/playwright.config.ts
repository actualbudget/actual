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
    // `threshold` is pixelmatch's per-pixel YIQ-delta cutoff: a pixel only
    // counts toward `maxDiffPixels` if its delta exceeds 35215 * threshold².
    // Playwright's default (0.2 → cutoff 1408) silently swallows faint
    // overlays — e.g. striping the transactions table with rgba(…, .15)
    // produces deltas of ~270–320, so VRT reported 0 diff pixels and passed
    // (PR #7841). Drop to 0.05 (cutoff ~88) so low-alpha tints are flagged
    // while still leaving headroom for anti-aliasing noise.
    toHaveScreenshot: { maxDiffPixels: 5, threshold: 0.05 },
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

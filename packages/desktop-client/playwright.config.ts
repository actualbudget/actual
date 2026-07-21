import path from 'node:path';

import { defineConfig } from '@playwright/test';

const e2ePort = Number(process.env.E2E_PORT) || 3001;

export default defineConfig({
  timeout: 60000, // 60 seconds
  retries: 1,
  fullyParallel: true,
  workers: Number(process.env.E2E_WORKERS) || (process.env.CI ? 4 : undefined),
  testDir: 'e2e/',
  reporter: process.env.CI
    ? [['blob'], ['list'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['html', { open: 'never' }]],
  use: {
    userAgent: 'playwright',
    screenshot: 'only-on-failure',
    browserName: 'chromium',
    baseURL: process.env.E2E_START_URL ?? `http://localhost:${e2ePort}`,
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
    // `threshold` is pixelmatch's per-pixel YIQ-delta cutoff — a pixel
    // counts toward `maxDiffPixels` only if its delta exceeds
    // 35215 * threshold². Playwright's 0.2 default lets faint color
    // overlays (e.g. rgba(…, .15) row striping) slip through with 0
    // reported diff pixels; 0.05 catches them while staying above
    // anti-aliasing noise.
    toHaveScreenshot: { maxDiffPixels: 5, threshold: 0.05 },
  },
  webServer: process.env.E2E_START_URL
    ? undefined
    : {
        cwd: path.join(__dirname, '..', '..'),
        command: process.env.E2E_USE_BUILD
          ? `PORT=${e2ePort} node packages/desktop-client/bin/serve-build.mjs`
          : 'yarn start',
        url: `http://localhost:${e2ePort}`,
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
        ignoreHTTPSErrors: true,
        timeout: 120_000,
      },
});

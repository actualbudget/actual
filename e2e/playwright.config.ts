import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Path where the app-session storageState is written by the setup project
 * and consumed by the main test project. Captures localStorage/sessionStorage
 * so that the server-selection step is skipped in every test.
 */
export const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'app-session.json');

/**
 * Init script injected into every page context.
 * Disables CSS transitions and animations to prevent timing-related flakiness
 * in click-stability checks that Playwright performs before interactions.
 */
const disableAnimationsScript = `
  Object.defineProperty(document, 'hidden', { value: false });
  const style = document.createElement('style');
  style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(style);
`;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  /* Run all tests in parallel by default */
  fullyParallel: true,

  /* Fail the build on CI if a test.only is accidentally committed */
  forbidOnly: !!process.env.CI,

  /* Retry once on CI to smooth over transient network/render flakiness */
  retries: process.env.CI ? 1 : 0,

  /* 4 workers on CI; auto-detect locally */
  workers: process.env.CI ? 4 : undefined,

  reporter: process.env.CI
    ? [['blob'], ['list']]
    : [['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',

    /* Capture trace on first retry to aid debugging */
    trace: 'on-first-retry',

    /* Screenshots only on failure */
    screenshot: 'only-on-failure',

    /* Per-action and navigation timeouts */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    /* Inject animation-disable script into every page */
    contextOptions: {
      reducedMotion: 'reduce',
    },
  },

  /* Per-test timeout: setup (click-through + demo load) takes ~15s, leaving
   * ~45s for the test body actions. The default 30s is too tight. */
  timeout: 60_000,

  /* Global assertion timeout */
  expect: {
    timeout: 10_000,
  },

  projects: [
    /**
     * Setup project: runs app.setup.ts once before any test.
     * Saves storageState (localStorage / sessionStorage) so that the
     * "server selection" screen is skipped in every subsequent test.
     */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts$/,
    },

    /**
     * Main Chromium project: depends on setup, starts every test with
     * the saved storageState so the server-selection step is already done.
     */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_PATH,
      },
      dependencies: ['setup'],
    },
  ],

  /**
   * Start the dev server automatically when E2E_START_SERVER=1.
   * In development, prefer running `yarn start` from the repo root manually
   * and leaving this undefined so tests reuse the live server.
   */
  webServer: process.env.E2E_START_SERVER
    ? {
        command: 'yarn start',
        cwd: path.join(__dirname, '..'),
        url: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});

export { disableAnimationsScript };

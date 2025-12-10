import {
  test as baseTest,
  expect as baseExpect,
  type Locator,
  type Page,
  type BrowserContext,
} from '@playwright/test';

// Default desktop viewport size (matches VRT screenshots)
const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

// Custom test fixture that provides a shared browser context and page across tests
// This reduces bandwidth by caching static assets and reusing the same page
export const test = baseTest.extend<
  { page: Page },
  { sharedContext: BrowserContext; sharedPage: Page }
>({
  // Worker-scoped context: shared across all tests in a worker
  sharedContext: [
    async ({ browser }, runTest) => {
      const context = await browser.newContext({
        viewport: DEFAULT_VIEWPORT,
      });
      await runTest(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  // Worker-scoped page: created once and reused across all tests in a worker
  sharedPage: [
    async ({ sharedContext }, runTest) => {
      const page = await sharedContext.newPage();
      // Navigate to base URL (read from env or default)
      const baseURL = process.env.E2E_START_URL ?? 'http://localhost:3001';
      await page.goto(baseURL);
      await runTest(page);
      await page.close();
    },
    { scope: 'worker' },
  ],

  // Test-scoped page: cleans up and returns the shared page for each test
  page: async ({ sharedContext, sharedPage, baseURL }, runTest) => {
    // Reset viewport to default desktop size (mobile tests may have changed it)
    await sharedPage.setViewportSize(DEFAULT_VIEWPORT);

    // Clear cookies
    await sharedContext.clearCookies();

    // Clear local and session storage, IndexedDB, and navigate to base URL
    // Using window.location.href instead of page.goto() to avoid a full page reload
    const targetURL = baseURL ?? '/';
    await sharedPage.evaluate(url => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear IndexedDB databases
      if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
      // Navigate using window.location to reuse cached resources
      window.location.href = url;
    }, targetURL);

    // Wait for navigation to complete
    await sharedPage.waitForURL(targetURL);

    await runTest(sharedPage);
  },
});

export const expect = baseExpect.extend({
  async toMatchThemeScreenshots(locator: Locator) {
    // Disable screenshot assertions in regular e2e tests;
    // only enable them when doing VRT tests
    if (!process.env.VRT) {
      return {
        message: () => 'passed',
        pass: true,
      };
    }

    const config = {
      // eslint-disable-next-line actual/typography
      mask: [locator.locator('[data-vrt-mask="true"]')],
      maxDiffPixels: 5,
    };

    // Get the data-theme attribute from page.
    // If there is a page() function, it means that the locator
    // is not a page object but a locator object.
    const dataThemeLocator =
      typeof locator.page === 'function'
        ? locator.page().locator('[data-theme]')
        : locator.locator('[data-theme]');

    // Check lightmode
    await locator.evaluate(() => window.Actual.setTheme('auto'));
    await baseExpect(dataThemeLocator).toHaveAttribute('data-theme', 'auto');
    await baseExpect(locator).toHaveScreenshot(config);

    // Switch to darkmode and check
    await locator.evaluate(() => window.Actual.setTheme('dark'));
    await baseExpect(dataThemeLocator).toHaveAttribute('data-theme', 'dark');
    await baseExpect(locator).toHaveScreenshot(config);

    // Switch to midnight theme and check
    await locator.evaluate(() => window.Actual.setTheme('midnight'));
    await baseExpect(dataThemeLocator).toHaveAttribute(
      'data-theme',
      'midnight',
    );
    await baseExpect(locator).toHaveScreenshot(config);

    // Switch back to lightmode
    await locator.evaluate(() => window.Actual.setTheme('auto'));
    return {
      message: () => 'pass',
      pass: true,
    };
  },
});

import {
  expect as baseExpect,
  defineConfig,
  type Locator,
} from '@playwright/test';

export { test } from '@playwright/test';

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
      // eslint-disable-next-line rulesdir/typography
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
    await expect(locator).toHaveScreenshot(config);

    // Switch back to lightmode
    await locator.evaluate(() => window.Actual.setTheme('auto'));
    return {
      message: () => 'pass',
      pass: true,
    };
  },
});

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  timeout: 45000, // 45 seconds
  retries: 1,
  testDir: 'e2e/',
  reporter: !process.env.CI ? [['html', { open: 'never' }]] : undefined,
  use: {
    userAgent: 'playwright',
    screenshot: 'on',
    browserName: 'chromium',
    baseURL: process.env.E2E_START_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  expect: {
    toHaveScreenshot: { maxDiffPixels: 5 },
  },
});

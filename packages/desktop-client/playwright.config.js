import { expect, defineConfig } from '@playwright/test';

expect.extend({
  async toMatchThemeScreenshots(locator) {
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
    await expect(dataThemeLocator).toHaveAttribute('data-theme', 'auto');
    const lightmode = await expect(locator).toHaveScreenshot(config);

    if (lightmode && !lightmode.pass) {
      return lightmode;
    }

    // Switch to darkmode and check
    await locator.evaluate(() => window.Actual.setTheme('dark'));
    await expect(dataThemeLocator).toHaveAttribute('data-theme', 'dark');
    const darkmode = await expect(locator).toHaveScreenshot(config);

    // Assert on
    if (darkmode && !darkmode.pass) {
      return darkmode;
    }

    // Switch to midnight theme and check
    await locator.evaluate(() => window.Actual.setTheme('midnight'));
    await expect(dataThemeLocator).toHaveAttribute('data-theme', 'midnight');
    const midnightMode = await expect(locator).toHaveScreenshot(config);

    // Assert on
    if (midnightMode && !midnightMode.pass) {
      return midnightMode;
    }

    // Switch back to lightmode
    await locator.evaluate(() => window.Actual.setTheme('auto'));
    return {
      message: () => 'pass',
      pass: true,
    };
  },
});

// eslint-disable-next-line import/no-unused-modules, import/no-default-export
export default defineConfig({
  timeout: 30000, // 30 seconds
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

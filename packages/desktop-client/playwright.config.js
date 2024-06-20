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

    // Check lightmode
    await locator.evaluate(() => window.Actual.setTheme('light'));
    const lightmode = await expect(locator).toHaveScreenshot(config);

    if (lightmode && !lightmode.pass) {
      return lightmode;
    }

    // Switch to darkmode and check
    await locator.evaluate(() => window.Actual.setTheme('dark'));
    const darkmode = await expect(locator).toHaveScreenshot(config);

    // Assert on
    if (darkmode && !darkmode.pass) {
      return darkmode;
    }

    // Switch to midnight theme and check
    await locator.evaluate(() => window.Actual.setTheme('midnight'));
    const midnightMode = await expect(locator).toHaveScreenshot(config);

    // Assert on
    if (midnightMode && !midnightMode.pass) {
      return midnightMode;
    }

    // Switch back to lightmode
    await locator.evaluate(() => window.Actual.setTheme('light'));
    return {
      message: () => 'pass',
      pass: true,
    };
  },
});

// eslint-disable-next-line import/no-unused-modules, import/no-default-export
export default defineConfig({
  timeout: 20000, // 20 seconds
  retries: 1,
  testDir: 'e2e/',
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

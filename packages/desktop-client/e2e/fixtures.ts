import { test as base, expect as baseExpect } from '@playwright/test';
import type { Browser, Locator } from '@playwright/test';

/**
 * Disable CSS transitions and animations globally in e2e (non-VRT) runs.
 * The Modal component's 100ms opacity transition races with Playwright's
 * click-stability check under parallel CI load ("element was detached
 * from the DOM, retrying"); snapping to final state makes clicks
 * deterministic.
 *
 * Wraps `browser.newPage` on the worker-scoped browser fixture because
 * every test creates its own page via `browser.newPage()` rather than
 * using the test-scoped `page` fixture — a `page`-fixture override would
 * be a no-op.
 */
const disableAnimationsInitScript = () => {
  const css = `*, *::before, *::after {
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }`;
  const install = () => {
    const style = document.createElement('style');
    style.setAttribute('data-e2e-disable-animations', 'true');
    style.textContent = css;
    document.head.appendChild(style);
  };
  if (document.head) {
    install();
  } else {
    document.addEventListener('DOMContentLoaded', install);
  }
};

export const test = process.env.VRT
  ? base
  : base.extend<object, { browser: Browser }>({
      browser: [
        async ({ browser }, runWithBrowser) => {
          const originalNewPage = browser.newPage.bind(browser);
          browser.newPage = async options => {
            const page = await originalNewPage(options);
            await page.addInitScript(disableAnimationsInitScript);
            return page;
          };
          await runWithBrowser(browser);
        },
        { scope: 'worker' },
      ],
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

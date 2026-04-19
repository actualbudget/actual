import { test as base, expect as baseExpect } from '@playwright/test';
import type { Locator } from '@playwright/test';

/**
 * Disable CSS transitions and animations globally in e2e (non-VRT) runs.
 *
 * The Modal component applies a 100ms opacity+transform transition via
 * inline JS, and InitialFocus triggers a focus-driven re-render. Under
 * parallel CI load these race with Playwright's click-stability check,
 * causing flakes like "element was detached from the DOM, retrying"
 * when clicking buttons inside a freshly-opened modal (e.g.
 * navigation.createAccount). Forcing transition/animation duration to
 * 0 lets elements snap to their final state so click stability
 * passes deterministically.
 *
 * VRT runs intentionally keep animations enabled so screenshots remain
 * consistent with their baselines.
 */
export const test = process.env.VRT
  ? base
  : base.extend({
      page: async ({ page }, runTest) => {
        await page.addInitScript(() => {
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
        });
        await runTest(page);
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

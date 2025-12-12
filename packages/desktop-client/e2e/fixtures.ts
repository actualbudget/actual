import {
  test as base,
  expect as baseExpect,
  type Locator,
} from '@playwright/test';
import { CacheRoute } from 'playwright-network-cache';

type Fixtures = {
  cacheRoute?: CacheRoute;
};

const STATIC_ASSET_PATTERN =
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)(\?.*)?$/;

/* eslint-disable react-hooks/rules-of-hooks */
export const test = base.extend<Fixtures>({
  cacheRoute: async ({ page }, use) => {
    // Only enable static asset caching in CI to reduce bandwidth usage
    if (process.env.CI) {
      const cacheRoute = new CacheRoute(page, {
        baseDir: 'e2e/.network-cache',
      });

      // Cache static assets
      await cacheRoute.GET('*', {
        match: req => STATIC_ASSET_PATTERN.test(req.url()),
      });

      await use(cacheRoute);
    } else {
      await use(undefined);
    }
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

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

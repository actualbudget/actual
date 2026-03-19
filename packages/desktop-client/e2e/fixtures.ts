import { expect as baseExpect } from '@playwright/test';
import type { Locator, TestInfo } from '@playwright/test';

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- merges with lib.dom Window
  interface Window {
    Actual: {
      setTheme(theme: string): void;
    };
  }
}

export { test } from '@playwright/test';

type PlaywrightGlobals = { currentTestInfo: () => TestInfo | null };

let playwrightGlobalsPromise: Promise<PlaywrightGlobals> | undefined;

async function getPlaywrightGlobals(): Promise<PlaywrightGlobals> {
  playwrightGlobalsPromise ??= import('./load-playwright-globals.cjs').then(
    m => m.default,
  );
  return playwrightGlobalsPromise;
}

type AppendManifest = (testInfo: TestInfo) => void;

let appendManifestPromise: Promise<AppendManifest> | undefined;

async function getAppendVrtSnapshotManifestLine(): Promise<AppendManifest> {
  appendManifestPromise ??= import('./vrt-manifest.mjs').then(
    m => m.appendVrtSnapshotManifestLine,
  );
  return appendManifestPromise;
}

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

    const { currentTestInfo } = await getPlaywrightGlobals();
    const testInfo = currentTestInfo();
    if (!testInfo) {
      throw new Error('toMatchThemeScreenshots() must be called during a test');
    }

    const appendVrtSnapshotManifestLine =
      await getAppendVrtSnapshotManifestLine();

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

    try {
      // Check lightmode
      await locator.evaluate(() => window.Actual.setTheme('auto'));
      await baseExpect(dataThemeLocator).toHaveAttribute('data-theme', 'auto');
      await baseExpect(locator).toHaveScreenshot(config);
      appendVrtSnapshotManifestLine(testInfo);

      // Switch to darkmode and check
      await locator.evaluate(() => window.Actual.setTheme('dark'));
      await baseExpect(dataThemeLocator).toHaveAttribute('data-theme', 'dark');
      await baseExpect(locator).toHaveScreenshot(config);
      appendVrtSnapshotManifestLine(testInfo);

      // Switch to midnight theme and check
      await locator.evaluate(() => window.Actual.setTheme('midnight'));
      await baseExpect(dataThemeLocator).toHaveAttribute(
        'data-theme',
        'midnight',
      );
      await baseExpect(locator).toHaveScreenshot(config);
      appendVrtSnapshotManifestLine(testInfo);
    } finally {
      await locator.evaluate(() => window.Actual.setTheme('auto'));
    }

    return {
      message: () => 'pass',
      pass: true,
    };
  },
});

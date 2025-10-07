import { createHash } from 'node:crypto';

import { expect as baseExpect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export { test };

/**
 * Same as Playwright snapshot `{testName}` / `TestInfoImpl._fsSanitizedTestName()`:
 * `titlePath.slice(1).join(' ')`, then trim (100) + sanitize for file path.
 */
function sanitizedTestName(): string {
  const fullTitleWithoutSpec = test.info().titlePath.slice(1).join(' ');
  return sanitizeForFilePath(trimLongString(fullTitleWithoutSpec));
}

/** Mirrors `playwright-core` `sanitizeForFilePath` (used for `{testName}`). */
function sanitizeForFilePath(s: string): string {
  // Same character class as Playwright `playwright-core` `sanitizeForFilePath` (snapshot `{testName}`).
  // oxlint-disable-next-line eslint/no-control-regex -- must match Playwright's implementation
  return s.replace(/[\x00-\x2C\x2E-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g, '-');
}

/** Mirrors `playwright/lib/util` `trimLongString` (default length 100). */
function trimLongString(s: string, length = 100): string {
  if (s.length <= length) {
    return s;
  }
  const hash = createHash('sha1').update(s).digest('hex');
  const middle = `-${hash.substring(0, 5)}-`;
  const start = Math.floor((length - middle.length) / 2);
  const end = length - middle.length - start;
  return s.substring(0, start) + middle + s.slice(-end);
}

function sanitizeSuffix(suffix: string): string {
  return sanitizeForFilePath(suffix.trim());
}

function getPage(target: Locator | Page): Page {
  const isLocator = (t: Locator | Page): t is Locator =>
    'page' in t && typeof t.page === 'function';

  if (isLocator(target)) {
    return target.page();
  }
  return target;
}

/**
 * Gives the page a chance to paint after theme changes (React re-render, virtualized lists).
 * Runs before each VRT screenshot so captures are not taken mid-layout.
 */
async function waitForVisualStability(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
  await page.waitForTimeout(1000);
}

function setTheme(page: Page, theme: string) {
  return page.evaluate(t => {
    const w = globalThis as unknown as {
      Actual: { setTheme: (theme: string) => void };
    };
    w.Actual.setTheme(t);
  }, theme);
}

export const expect = baseExpect.extend({
  /**
   * @param suffix Optional segment appended after the `{testName}`-equivalent token,
   * then theme (`{testName}-{suffix}-auto.png`, etc.).
   */
  async toMatchThemeScreenshots(locator: Locator | Page, suffix?: string) {
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
    } satisfies {
      mask: Locator[];
      maxDiffPixels: number;
    };

    const page = getPage(locator);
    const dataThemeLocator = page.locator('[data-theme]');

    const suffixTrimmed = suffix?.trim() ?? '';
    const hasSuffix = suffixTrimmed.length > 0;
    const testName = hasSuffix ? sanitizedTestName() : undefined;
    const suffixSegment = hasSuffix ? sanitizeSuffix(suffixTrimmed) : undefined;

    async function assertScreenshot(theme: 'auto' | 'dark' | 'midnight') {
      await waitForVisualStability(page);
      const fileName =
        testName !== undefined && suffixSegment !== undefined
          ? `${testName}-${suffixSegment}-${theme}.png`
          : undefined;
      if (fileName) {
        await baseExpect(locator).toHaveScreenshot(fileName, config);
      } else {
        await baseExpect(locator).toHaveScreenshot(config);
      }
    }

    // Check lightmode
    await setTheme(page, 'auto');
    await baseExpect(dataThemeLocator).toHaveAttribute('data-theme', 'auto');
    await assertScreenshot('auto');

    // Switch to darkmode and check
    await setTheme(page, 'dark');
    await baseExpect(dataThemeLocator).toHaveAttribute('data-theme', 'dark');
    await assertScreenshot('dark');

    // Switch to midnight theme and check
    await setTheme(page, 'midnight');
    await baseExpect(dataThemeLocator).toHaveAttribute(
      'data-theme',
      'midnight',
    );
    await assertScreenshot('midnight');

    // Switch back to lightmode
    await setTheme(page, 'auto');
    return {
      message: () => 'pass',
      pass: true,
    };
  },
});

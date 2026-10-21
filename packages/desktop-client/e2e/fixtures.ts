import { test as base, expect as baseExpect } from '@playwright/test';
import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';

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

/**
 * Storage engine the backend worker runs on. Set E2E_STORAGE_BACKEND to
 * `memory-idb` to force the fallback of browsers without OPFS sync access
 * handles; unset means the app's default. The key mirrors
 * loot-core/src/platform/client/browser-preload/storage-backend.ts.
 */
export const E2E_STORAGE_BACKEND = process.env.E2E_STORAGE_BACKEND;
const STORAGE_BACKEND_KEY = 'actual:storage-backend';
/** A test that drives the flag itself sets this in sessionStorage first. */
export const MANUAL_STORAGE_BACKEND_FLAG = 'e2e-manual-storage-backend';

const storageBackendInitScript = ({
  key,
  backend,
  manualFlag,
}: {
  key: string;
  backend: string;
  manualFlag: string;
}) => {
  try {
    if (!sessionStorage.getItem(manualFlag)) {
      localStorage.setItem(key, backend);
    }
  } catch {
    // Without storage the app uses its default engine
  }
};

/**
 * Installs the e2e init scripts on a page or context. `browser.newPage`
 * gets them automatically; tests that create their own context (several
 * tabs sharing storage) call this themselves.
 */
export async function addE2EInitScripts(target: Page | BrowserContext) {
  await target.addInitScript(disableAnimationsInitScript);
  if (E2E_STORAGE_BACKEND) {
    await target.addInitScript(storageBackendInitScript, {
      key: STORAGE_BACKEND_KEY,
      backend: E2E_STORAGE_BACKEND,
      manualFlag: MANUAL_STORAGE_BACKEND_FLAG,
    });
  }
}

export const test = process.env.VRT
  ? base
  : base.extend<object, { browser: Browser }>({
      browser: [
        async ({ browser }, runWithBrowser) => {
          const originalNewPage = browser.newPage.bind(browser);
          browser.newPage = async options => {
            const page = await originalNewPage(options);
            await addE2EInitScripts(page);
            return page;
          };
          await runWithBrowser(browser);
        },
        { scope: 'worker' },
      ],
    });

export const expect = baseExpect.extend({
  async toMatchThemeScreenshots(target: Locator | Page) {
    // Disable screenshot assertions in regular e2e tests;
    // only enable them when doing VRT tests
    if (!process.env.VRT) {
      return {
        message: () => 'passed',
        pass: true,
      };
    }

    const config = {
      mask: [target.locator('[data-vrt-mask="true"]')],
    };

    const page: Page = 'page' in target ? target.page() : target;
    const dataThemeLocator = page.locator('[data-theme]');

    // Check lightmode
    await page.evaluate(() => window.Actual.setTheme('auto'));
    await baseExpect(dataThemeLocator).toHaveAttribute('data-theme', 'auto');
    await baseExpect(target).toHaveScreenshot(config);

    // Switch to darkmode and check
    await page.evaluate(() => window.Actual.setTheme('dark'));
    await baseExpect(dataThemeLocator).toHaveAttribute('data-theme', 'dark');
    await baseExpect(target).toHaveScreenshot(config);

    // Switch to midnight theme and check
    await page.evaluate(() => window.Actual.setTheme('midnight'));
    await baseExpect(dataThemeLocator).toHaveAttribute(
      'data-theme',
      'midnight',
    );
    await baseExpect(target).toHaveScreenshot(config);

    // Switch back to lightmode
    await page.evaluate(() => window.Actual.setTheme('auto'));
    return {
      message: () => 'pass',
      pass: true,
    };
  },
});

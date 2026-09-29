import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { SettingsPage } from './page-models/settings-page';

test.describe('Settings', () => {
  let page: Page;
  let navigation: Navigation;
  let settingsPage: SettingsPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    settingsPage = await navigation.goToSettingsPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await expect(page).toMatchThemeScreenshots();
  });

  test('downloads the export of the budget', async () => {
    const downloadPromise = page.waitForEvent('download');

    await settingsPage.exportData();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-.*.zip$/);
  });

  test('keeps the global CSS override readable after switching themes', async () => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.route('**/customThemeCatalog.json', route =>
      route.fulfill({
        json: [{ name: 'Test theme', repo: 'test/theme', mode: 'light' }],
      }),
    );
    await page.route('**/test/theme/refs/heads/main/actual.css*', route =>
      route.fulfill({ body: ':root { --color-pageBackground: #eeeeee; }' }),
    );
    await page.evaluate(() => window.Actual.setTheme('light'));
    await page.getByRole('button', { name: 'Light', exact: true }).click();
    await page
      .getByRole('button', { name: 'Custom theme', exact: true })
      .click();
    await page.getByRole('button', { name: 'Test theme', exact: true }).click();
    const css = ':root { --color-pageBackground: #abcdef; }';
    await page.getByRole('textbox', { name: 'Custom Theme CSS' }).fill(css);
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    const indicator = page.getByRole('button', {
      name: 'Custom CSS override active — click to edit',
    });
    let currentTheme = 'Test theme';
    for (const nextTheme of ['Dark', 'Midnight', 'Light', 'System default']) {
      await page
        .getByRole('button', { name: currentTheme, exact: true })
        .click();
      await page.getByRole('button', { name: nextTheme, exact: true }).click();
      await expect(indicator).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() =>
            getComputedStyle(document.documentElement)
              .getPropertyValue('--color-pageBackground')
              .trim(),
          ),
        )
        .toBe('#abcdef');
      currentTheme = nextTheme;
    }

    for (const width of [1024, 800, 375]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 375) {
        await expect(page.getByRole('navigation')).toBeVisible();
      }
      await indicator.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: test.info().outputPath(`system-default-${width}.png`),
      });
      const indicatorBounds = await indicator.boundingBox();
      const lightBounds = await page
        .getByRole('button', { name: 'Light', exact: true })
        .boundingBox();
      if (!indicatorBounds || !lightBounds) {
        throw new Error('Missing theme controls');
      }
      const overlapsLightSelector =
        indicatorBounds.x < lightBounds.x + lightBounds.width &&
        indicatorBounds.x + indicatorBounds.width > lightBounds.x &&
        indicatorBounds.y < lightBounds.y + lightBounds.height &&
        indicatorBounds.y + indicatorBounds.height > lightBounds.y;
      expect(overlapsLightSelector).toBe(false);
      await expect(indicator).toBeInViewport();
    }
    await indicator.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('textbox', { name: 'Custom Theme CSS' }),
    ).toHaveValue(css);
    await page.getByRole('textbox', { name: 'Custom Theme CSS' }).fill('');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(indicator).toBeHidden();
    await expect(page.locator('#custom-theme-active')).toHaveCount(0);
  });
});

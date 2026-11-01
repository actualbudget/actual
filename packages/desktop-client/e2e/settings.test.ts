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

  test('recommends a backup even when currency precision stays the same', async () => {
    await settingsPage.goToSection('General');
    const currencySelect = page.locator('#default-currency-select');
    await currencySelect.click();
    await page.getByRole('button', { name: 'USD - US Dollar ($)' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByText('Back up your budget')).toBeVisible();
    await expect(modal.getByText('Change decimal precision')).not.toBeVisible();
    await expect(
      modal.getByRole('link', { name: 'Go to backup and export settings' }),
    ).toBeVisible();
    await expect(
      modal.getByRole('button', { name: 'Export data' }),
    ).not.toBeVisible();
    await expect(modal).toMatchThemeScreenshots();
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await currencySelect.click();
    await page.getByRole('button', { name: 'USD - US Dollar ($)' }).click();
    await modal
      .getByRole('link', { name: 'Go to backup and export settings' })
      .click();
    await expect(modal).not.toBeVisible();
    await expect(settingsPage.exportDataButton).toBeInViewport();
    await currencySelect.click();
    await page.getByRole('button', { name: 'USD - US Dollar ($)' }).click();
    await expect(
      modal.getByRole('checkbox', { name: 'I have made a backup' }),
    ).not.toBeChecked();
    await modal.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(modal).not.toBeVisible();
    await currencySelect.click();
    await page.getByRole('button', { name: 'EUR - Euro (€)' }).click();
    await expect(modal.getByText('Back up your budget')).toBeVisible();
    await expect(modal.getByText('Change decimal precision')).not.toBeVisible();
    await modal.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(modal).not.toBeVisible();
  });

  test('converts precision in place when the currency changes', async () => {
    await settingsPage.goToSection('General');
    const currencySelect = page.locator('#default-currency-select');
    await currencySelect.click();
    await page.getByRole('button', { name: 'JPY - Japanese Yen (¥)' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByText('Change decimal precision')).toBeVisible();
    await expect(
      modal.getByText('Convert from 2 decimal places to 0 decimal places.', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(modal).toMatchThemeScreenshots();
    await modal
      .getByRole('button', { name: 'Confirm precision change' })
      .click();
    await expect(modal).not.toBeVisible();
    await page.reload();
    await settingsPage.waitFor();
    await settingsPage.goToSection('General');
    await expect(currencySelect).toContainText('JPY');
    await currencySelect.click();
    await page.getByRole('button', { name: 'USD - US Dollar ($)' }).click();
    await expect(
      modal.getByText('Convert from 0 decimal places to 2 decimal places.', {
        exact: false,
      }),
    ).toBeVisible();
    await modal
      .getByRole('button', { name: 'Confirm precision change' })
      .click();
    await expect(modal).not.toBeVisible();
    await expect(currencySelect).toContainText('USD');
  });

  test('downloads the export of the budget', async () => {
    const downloadPromise = page.waitForEvent('download');

    await settingsPage.exportData();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-.*.zip$/);
  });

  test('moves pages between the sidebar and settings', async () => {
    await settingsPage.settings
      .locator('label[for="toggle-sidebar-item-payees"]')
      .click();
    await settingsPage.settings
      .locator('label[for="toggle-sidebar-item-schedules"]')
      .click();

    const sidebar = page.getByTestId('sidebar-primary-buttons');
    await expect(sidebar.getByRole('link', { name: 'Payees' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Schedules' })).toHaveCount(
      0,
    );
    await expect(
      settingsPage.settingsNav.getByRole('link', { name: 'Schedules' }),
    ).toBeVisible();
    await expect(
      settingsPage.settingsNav.getByRole('link', { name: 'Payees' }),
    ).toHaveCount(0);

    await settingsPage.settingsNav
      .getByRole('link', { name: 'Schedules' })
      .click();
    await expect(page).toHaveURL(/\/settings\/schedules$/);
    await expect(settingsPage.settingsNav).toBeVisible();

    await sidebar.getByRole('link', { name: 'Payees' }).click();
    await expect(page).toHaveURL(/\/payees$/);
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
    await expect(async () => {
      await page.evaluate(() => window.Actual.setTheme('light'));
      await expect(page.locator('[data-theme]')).toHaveAttribute(
        'data-theme',
        'light',
        { timeout: 1000 },
      );
    }).toPass({ timeout: 15000 });
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

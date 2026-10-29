import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import { MobileTransactionEntryPage } from './page-models/mobile-transaction-entry-page';

test.describe('Mobile Settings', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({
      width: 350,
      height: 600,
    });
    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks that settings page can be opened', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await expect(page).toMatchThemeScreenshots();

    const downloadPromise = page.waitForEvent('download');

    await settingsPage.exportData();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-.*.zip$/);
    await expect(page).toMatchThemeScreenshots();
  });

  test('opens the budget by default', async () => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/budget$/);

    await page.goto('/does-not-exist');
    await expect(page).toHaveURL(/\/budget$/);
  });

  test('opens the chosen start page', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.setMobileStartPage('Accounts');
    await expect(
      settingsPage.settings.locator('#settings-mobileStartPage'),
    ).toHaveText('Accounts');

    await page.goto('/');
    await expect(page).toHaveURL(/\/accounts$/);
    await expect(navigation.navbar).toBeVisible();

    // The redirect replaces `/` in the history, so Back returns to Settings
    // instead of bouncing through the start page or /budget
    await page.goBack();
    await expect(page).toHaveURL(/\/settings\/general$/);

    await page.goto('/does-not-exist');
    await expect(page).toHaveURL(/\/accounts$/);
  });

  test('opens the schedules page', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.setMobileStartPage('Schedules');

    await page.goto('/');
    await expect(page).toHaveURL(/\/schedules$/);
    await expect(navigation.navbar).toBeVisible();
  });

  test.describe('with the transaction page as start page', () => {
    let transactionEntryPage: MobileTransactionEntryPage;

    test.beforeEach(async () => {
      const settingsPage = await navigation.goToSettingsPage();
      await settingsPage.setMobileStartPage('Transaction');

      await page.goto('/');
      await expect(page).toHaveURL(/\/transactions\/new$/);
      transactionEntryPage = new MobileTransactionEntryPage(page);
      await expect(transactionEntryPage.header).toHaveText('New Transaction');
    });

    test('goes to the budget after adding a transaction', async () => {
      await transactionEntryPage.fillAmount('12.34');
      await transactionEntryPage.header.click();
      await transactionEntryPage.fillField(
        page.getByTestId('payee-field'),
        'Kroger',
      );
      await transactionEntryPage.fillField(
        page.getByTestId('category-field'),
        'Clothing',
      );
      await transactionEntryPage.fillField(
        page.getByTestId('account-field'),
        'Ally Savings',
      );
      await transactionEntryPage.createTransaction();

      await expect(page).toHaveURL(/\/budget$/);
    });

    test('goes to the budget when pressing Back', async () => {
      await page.getByRole('button', { name: 'Back' }).click();

      await expect(page).toHaveURL(/\/budget$/);
    });
  });

  test('keeps the start page per budget', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.setMobileStartPage('Accounts');
    await expect(
      settingsPage.settings.locator('#settings-mobileStartPage'),
    ).toHaveText('Accounts');

    await settingsPage.backButton.click();
    await page.getByRole('button', { name: 'Switch file' }).click();
    await page.getByRole('button', { name: 'Create test file' }).click();
    await expect(page).toHaveURL(/\/budget$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/budget$/);
  });
});

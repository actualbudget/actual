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

  test('opens the chosen start page', async () => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/budget$/);
    await page.goto('/does-not-exist');
    await expect(page).toHaveURL(/\/budget$/);

    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.setMobileStartPage('Accounts');

    await page.goto('/');
    await expect(page).toHaveURL(/\/accounts$/);
    await expect(navigation.navbar).toBeVisible();

    // The redirect replaces `/` in the history, so Back returns to Settings
    // instead of bouncing through the start page or /budget
    await page.goBack();
    await expect(page).toHaveURL(/\/settings\/general$/);

    await page.goto('/does-not-exist');
    await expect(page).toHaveURL(/\/accounts$/);

    await page.goto('/settings/general');
    await settingsPage.setMobileStartPage('Schedules');
    await page.goto('/');
    await expect(page).toHaveURL(/\/schedules$/);
    await expect(navigation.navbar).toBeVisible();
  });

  test('leaves the transaction start page for the budget', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.setMobileStartPage('Transaction');

    const transactionEntryPage = new MobileTransactionEntryPage(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/transactions\/new$/);
    await expect(transactionEntryPage.header).toHaveText('New Transaction');

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/budget$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/transactions\/new$/);
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

  test('browser Back from a fresh transaction start page tab does not loop', async ({
    browser,
  }) => {
    // The installed app's "Add transaction" shortcut and a new tab both open
    // with no earlier history. This needs a context that can hold a second
    // tab with the same budget open.
    const context = await browser.newContext({
      viewport: { width: 350, height: 600 },
    });
    const setupTab = await context.newPage();
    await setupTab.goto('/');
    await new ConfigurationPage(setupTab).createTestFile();
    const settingsPage = await new MobileNavigation(
      setupTab,
    ).goToSettingsPage();
    await settingsPage.setMobileStartPage('Transaction');

    // `window.open` gives a tab whose only history entry is the app, unlike
    // `context.newPage()`, which keeps an about:blank entry
    const [freshTab] = await Promise.all([
      context.waitForEvent('page'),
      setupTab.evaluate(() => {
        window.open('/', '_blank', 'noopener');
      }),
    ]);
    await expect(freshTab).toHaveURL(/\/transactions\/new$/);
    await expect(new MobileTransactionEntryPage(freshTab).header).toHaveText(
      'New Transaction',
    );

    await freshTab.goBack();
    await expect(freshTab).toHaveURL(/\/budget$/);
    await expect(new MobileNavigation(freshTab).navbar).toBeVisible();
    await context.close();
  });

  test('keeps the start page per budget', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.setMobileStartPage('Accounts');

    await settingsPage.backButton.click();
    await page.getByRole('button', { name: 'Switch file' }).click();
    await page.getByRole('button', { name: 'Create test file' }).click();
    await expect(page).toHaveURL(/\/budget$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/budget$/);
  });
});

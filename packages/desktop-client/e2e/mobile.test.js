import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile', () => {
  let page;
  let navigation;
  let configurationPage;

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
    await page.close();
  });

  test('loads the budget page with budgeted amounts', async () => {
    const budgetPage = await navigation.goToBudgetPage();

    await expect(budgetPage.categoryNames).toHaveText([
      'Food',
      'Restaurants',
      'Entertainment',
      'Clothing',
      'General',
      'Gift',
      'Medical',
      'Savings',
      'Cell',
      'Internet',
      'Mortgage',
      'Water',
      'Power',
    ]);
    await expect(page).toMatchThemeScreenshots();
  });

  test('opens the accounts page and asserts on balances', async () => {
    const accountsPage = await navigation.goToAccountsPage();

    const account = await accountsPage.getNthAccount(0);

    await expect(account.name).toHaveText('Bank of America');
    await expect(account.balance).toHaveText('7,653.00');
    await expect(page).toMatchThemeScreenshots();
  });

  test('opens individual account page and checks that filtering is working', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    const accountPage = await accountsPage.openNthAccount(1);

    await expect(accountPage.heading).toHaveText('Ally Savings');
    expect(await accountPage.getBalance()).toBeGreaterThan(0);

    await expect(accountPage.noTransactionsFoundError).not.toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    await accountPage.searchByText('nothing should be found');
    await expect(accountPage.noTransactionsFoundError).toBeVisible();
    await expect(accountPage.transactions).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();

    await accountPage.searchByText('Kroger');
    await expect(accountPage.transactions).not.toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();
  });

  test('creates a transaction via footer button', async () => {
    const transactionEntryPage = await navigation.goToTransactionEntryPage();
    await expect(page).toMatchThemeScreenshots();

    await expect(transactionEntryPage.header).toHaveText('New Transaction');

    await transactionEntryPage.amountField.fill('12.34');
    // Click anywhere to cancel active edit.
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
    await expect(page).toMatchThemeScreenshots();

    const accountPage = await transactionEntryPage.createTransaction();

    await expect(accountPage.transactions.nth(0)).toHaveText(
      'KrogerClothing-12.34',
    );
    await expect(page).toMatchThemeScreenshots();
  });

  test('creates a transaction from `/accounts/:id` page', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    const accountPage = await accountsPage.openNthAccount(2);
    const transactionEntryPage = await accountPage.clickCreateTransaction();

    await expect(transactionEntryPage.header).toHaveText('New Transaction');
    await expect(page).toMatchThemeScreenshots();

    await transactionEntryPage.amountField.fill('12.34');
    // Click anywhere to cancel active edit.
    await transactionEntryPage.header.click();
    await transactionEntryPage.fillField(
      page.getByTestId('payee-field'),
      'Kroger',
    );
    await transactionEntryPage.fillField(
      page.getByTestId('category-field'),
      'Clothing',
    );

    await transactionEntryPage.createTransaction();

    await expect(accountPage.transactions.nth(0)).toHaveText(
      'KrogerClothing-12.34',
    );
  });

  test('checks that settings page can be opened', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await expect(page).toMatchThemeScreenshots();

    const downloadPromise = page.waitForEvent('download');

    await settingsPage.exportData();

    const download = await downloadPromise;

    expect(await download.suggestedFilename()).toMatch(
      /^\d{4}-\d{2}-\d{2}-.*.zip$/,
    );
    await expect(page).toMatchThemeScreenshots();
  });
});

import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile Transactions', () => {
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

    await transactionEntryPage.createTransaction();
    await expect(page.getByLabel('Transaction list')).toHaveCount(0);
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

  test('creates an uncategorized transaction from `/accounts/uncategorized` page', async () => {
    // Create uncategorized transaction
    let transactionEntryPage = await navigation.goToTransactionEntryPage();
    await transactionEntryPage.amountField.fill('12.35');
    // Click anywhere to cancel active edit.
    await transactionEntryPage.header.click();
    await transactionEntryPage.fillField(
      page.getByTestId('account-field'),
      'Ally Savings',
    );
    await transactionEntryPage.createTransaction();

    const uncategorizedPage = await navigation.goToUncategorizedPage();
    transactionEntryPage = await uncategorizedPage.clickCreateTransaction();

    await expect(transactionEntryPage.header).toHaveText('New Transaction');

    await transactionEntryPage.amountField.fill('12.34');
    // Click anywhere to cancel active edit.
    await transactionEntryPage.header.click();
    await transactionEntryPage.fillField(
      page.getByTestId('payee-field'),
      'Kroger',
    );

    await transactionEntryPage.createTransaction();

    await expect(uncategorizedPage.transactions.nth(0)).toHaveText(
      'KrogerUncategorized-12.34',
    );
    await expect(page).toMatchThemeScreenshots();
  });

  test('creates a categorized transaction from `/accounts/uncategorized` page', async () => {
    // Create uncategorized transaction
    let transactionEntryPage = await navigation.goToTransactionEntryPage();
    await transactionEntryPage.amountField.fill('12.35');
    // Click anywhere to cancel active edit.
    await transactionEntryPage.header.click();
    await transactionEntryPage.fillField(
      page.getByTestId('account-field'),
      'Ally Savings',
    );
    await transactionEntryPage.createTransaction();

    const uncategorizedPage = await navigation.goToUncategorizedPage();
    transactionEntryPage = await uncategorizedPage.clickCreateTransaction();

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

    await transactionEntryPage.createTransaction();

    await expect(uncategorizedPage.transactions.nth(0)).toHaveText(
      '(No payee)Uncategorized-12.35',
    );
    await expect(page).toMatchThemeScreenshots();
  });
});

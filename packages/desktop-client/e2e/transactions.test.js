import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Transactions', () => {
  let page;
  let navigation;
  let accountPage;
  let configurationPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    accountPage = await navigation.goToAccountPage('Ally Savings');
  });

  test('checks the page visuals', async () => {
    await expect(page).toMatchThemeScreenshots();
  });

  test.describe('filters transactions', () => {
    // Reset filters
    test.afterEach(async () => {
      await accountPage.removeFilter(0);
    });

    test('by date', async () => {
      const filterTooltip = await accountPage.filterBy('Date');
      await expect(filterTooltip.page).toMatchThemeScreenshots();

      // Open datepicker
      await page.keyboard.press('Space');
      const datepicker = page.getByTestId('date-select-tooltip');
      await expect(datepicker).toMatchThemeScreenshots();

      // Select "is xxxxx"
      await datepicker.getByText('20', { exact: true }).click();
      await filterTooltip.applyButton.click();

      // Assert that there are no transactions
      await expect(accountPage.transactionTable).toHaveText('No transactions');
      await expect(page).toMatchThemeScreenshots();
    });

    test('by category', async () => {
      const filterTooltip = await accountPage.filterBy('Category');
      await expect(filterTooltip.page).toMatchThemeScreenshots();

      // Type in the autocomplete box
      const autocomplete = page.getByTestId('autocomplete');
      await expect(autocomplete).toMatchThemeScreenshots();

      // Select the active item
      await page.getByTestId('Clothing-category-item').click();
      await filterTooltip.applyButton.click();

      // Assert that there are only clothing transactions
      await expect(accountPage.getNthTransaction(0).category).toHaveText(
        'Clothing',
      );
      await expect(accountPage.getNthTransaction(1).category).toHaveText(
        'Clothing',
      );
      await expect(accountPage.getNthTransaction(2).category).toHaveText(
        'Clothing',
      );
      await expect(accountPage.getNthTransaction(3).category).toHaveText(
        'Clothing',
      );
      await expect(accountPage.getNthTransaction(4).category).toHaveText(
        'Clothing',
      );
      await expect(page).toMatchThemeScreenshots();
    });
  });

  test('creates a test transaction', async () => {
    await accountPage.createSingleTransaction({
      payee: 'Home Depot',
      notes: 'Notes field',
      category: 'Food',
      debit: '12.34',
    });

    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Home Depot');
    await expect(transaction.notes).toHaveText('Notes field');
    await expect(transaction.category).toHaveText('Food');
    await expect(transaction.debit).toHaveText('12.34');
    await expect(transaction.credit).toHaveText('');
    await expect(page).toMatchThemeScreenshots();
  });

  test('creates a split test transaction', async () => {
    await accountPage.createSplitTransaction([
      {
        payee: 'Krogger',
        notes: 'Notes',
        debit: '333.33',
      },
      {
        category: 'General',
        debit: '222.22',
      },
      {
        debit: '111.11',
      },
    ]);

    const firstTransaction = accountPage.getNthTransaction(0);
    await expect(firstTransaction.payee).toHaveText('Krogger');
    await expect(firstTransaction.notes).toHaveText('Notes');
    await expect(firstTransaction.category).toHaveText('Split');
    await expect(firstTransaction.debit).toHaveText('333.33');
    await expect(firstTransaction.credit).toHaveText('');

    const secondTransaction = accountPage.getNthTransaction(1);
    await expect(secondTransaction.payee).toHaveText('Krogger');
    await expect(secondTransaction.notes).toHaveText('');
    await expect(secondTransaction.category).toHaveText('General');
    await expect(secondTransaction.debit).toHaveText('222.22');
    await expect(secondTransaction.credit).toHaveText('');

    const thirdTransaction = accountPage.getNthTransaction(2);
    await expect(thirdTransaction.payee).toHaveText('Krogger');
    await expect(thirdTransaction.notes).toHaveText('');
    await expect(thirdTransaction.category).toHaveText('Categorize');
    await expect(thirdTransaction.debit).toHaveText('111.11');
    await expect(thirdTransaction.credit).toHaveText('');
    await expect(page).toMatchThemeScreenshots();
  });
});

import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Accounts', () => {
  let page;
  let navigation;
  let configurationPage;
  let accountPage;

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

  test('creates a new account and views the initial balance transaction', async () => {
    accountPage = await navigation.createAccount({
      name: 'New Account',
      offBudget: false,
      balance: 100,
    });

    const transaction = accountPage.getNthTransaction(0);
    await expect(transaction.payee).toHaveText('Starting Balance');
    await expect(transaction.notes).toHaveText('');
    await expect(transaction.category).toHaveText('Starting Balances');
    await expect(transaction.debit).toHaveText('');
    await expect(transaction.credit).toHaveText('100.00');
    await expect(page).toMatchThemeScreenshots();
  });

  test('closes an account', async () => {
    accountPage = await navigation.goToAccountPage('Roth IRA');

    await expect(accountPage.accountName).toHaveText('Roth IRA');

    const modal = await accountPage.clickCloseAccount();
    await modal.selectTransferAccount('Vanguard 401k');
    await expect(page).toMatchThemeScreenshots();
    await modal.closeAccount();

    await expect(accountPage.accountName).toHaveText('Closed: Roth IRA');
    await expect(page).toMatchThemeScreenshots();
  });

  test.describe('Budgeted Accounts', () => {
    // Reset filters
    test.afterEach(async () => {
      await accountPage.removeFilter(0);
    });

    test('creates a transfer from two existing transactions', async () => {
      accountPage = await navigation.goToAccountPage('For budget');
      await expect(accountPage.accountName).toHaveText('Budgeted Accounts');

      await accountPage.filterByNote('Test Acc Transfer');

      await accountPage.createSingleTransaction({
        account: 'Ally Savings',
        payee: '',
        notes: 'Test Acc Transfer',
        category: 'Food',
        debit: '34.56',
      });

      await accountPage.createSingleTransaction({
        account: 'HSBC',
        payee: '',
        notes: 'Test Acc Transfer',
        category: 'Food',
        credit: '34.56',
      });

      await accountPage.selectNthTransaction(0);
      await accountPage.selectNthTransaction(1);
      await accountPage.clickSelectAction('Make transfer');

      let transaction = accountPage.getNthTransaction(0);
      await expect(transaction.payee).toHaveText('Ally Savings');
      await expect(transaction.category).toHaveText('Transfer');
      await expect(transaction.credit).toHaveText('34.56');
      await expect(transaction.account).toHaveText('HSBC');

      transaction = accountPage.getNthTransaction(1);
      await expect(transaction.payee).toHaveText('HSBC');
      await expect(transaction.category).toHaveText('Transfer');
      await expect(transaction.debit).toHaveText('34.56');
      await expect(transaction.account).toHaveText('Ally Savings');
    });
  });
});

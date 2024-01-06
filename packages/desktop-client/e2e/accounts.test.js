import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Accounts', () => {
  let page;
  let navigation;
  let configurationPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createDemoFile();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('creates a new account and views the initial balance transaction', async () => {
    const accountPage = await navigation.createAccount({
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
    const accountPage = await navigation.goToAccountPage('Roth IRA');

    await expect(accountPage.accountName).toHaveText('Roth IRA');

    const modal = await accountPage.clickCloseAccount();
    await modal.selectTransferAccount('Vanguard 401k');
    await expect(page).toMatchThemeScreenshots();
    await modal.closeAccount();

    await expect(accountPage.accountName).toHaveText('Closed: Roth IRA');
    await expect(page).toMatchThemeScreenshots();
  });
});

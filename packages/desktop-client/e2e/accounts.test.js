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
    await configurationPage.createTestFile();
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

    expect(await accountPage.getNthTransaction(0)).toMatchObject({
      payee: 'Starting Balance',
      notes: '',
      category: 'Starting Balances',
      debit: '',
      credit: '100.00',
    });
  });

  test('closes an account', async () => {
    const accountPage = await navigation.goToAccountPage('Roth IRA');

    await expect(accountPage.accountName).toHaveText('Roth IRA');

    const modal = await accountPage.clickCloseAccount();
    await modal.selectTransferAccount('Vanguard 401k');
    await modal.closeAccount();

    await expect(accountPage.accountName).toHaveText('Closed: Roth IRA');
  });
});

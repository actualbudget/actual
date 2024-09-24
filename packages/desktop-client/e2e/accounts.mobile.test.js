import { test, expect } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

test.describe('Mobile Accounts', () => {
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

  test('opens the accounts page and asserts on balances', async () => {
    const accountsPage = await navigation.goToAccountsPage();

    const account = await accountsPage.getNthAccount(1);

    await expect(account.name).toHaveText('Ally Savings');
    await expect(account.balance).toHaveText('7,653.00');
    await expect(page).toMatchThemeScreenshots();
  });

  test('opens individual account page and checks that filtering is working', async () => {
    const accountsPage = await navigation.goToAccountsPage();
    const accountPage = await accountsPage.openNthAccount(0);

    await expect(accountPage.heading).toHaveText('Bank of America');
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
});

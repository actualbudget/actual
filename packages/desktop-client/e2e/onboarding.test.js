import path from 'path';

import { test, expect } from '@playwright/test';

import { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import screenshotConfig from './screenshot.config';

test.describe('Onboarding', () => {
  let page;
  let navigation;
  let configurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('checks the page visuals', async () => {
    await expect(configurationPage.heading).toHaveText('Where’s the server?');
    await expect(page).toHaveScreenshot(screenshotConfig(page));

    await configurationPage.clickOnNoServer();
    await expect(page).toHaveScreenshot(screenshotConfig(page));
  });

  test('creates a new budget file by importing YNAB4 budget', async () => {
    await configurationPage.clickOnNoServer();
    const budgetPage = await configurationPage.importBudget(
      'YNAB4',
      path.resolve(__dirname, 'data/ynab4-demo-budget.zip'),
    );

    await expect(budgetPage.budgetTable).toBeVisible({ timeout: 30000 });

    const accountPage = await navigation.goToAccountPage(
      'Account1 with Starting Balance',
    );
    await expect(accountPage.accountBalance).toHaveText('-400.00');

    await navigation.goToAccountPage('Account2 no Starting Balance');
    await expect(accountPage.accountBalance).toHaveText('2,607.00');
  });

  test('creates a new budget file by importing nYNAB budget', async () => {
    await configurationPage.clickOnNoServer();
    const budgetPage = await configurationPage.importBudget(
      'nYNAB',
      path.resolve(__dirname, 'data/ynab5-demo-budget.json'),
    );

    await expect(budgetPage.budgetTable).toBeVisible({ timeout: 30000 });

    const accountPage = await navigation.goToAccountPage('Checking');
    await expect(accountPage.accountBalance).toHaveText('700.00');

    await navigation.goToAccountPage('Saving');
    await expect(accountPage.accountBalance).toHaveText('200.00');
  });

  test('creates a new budget file by importing Actual budget', async () => {
    await configurationPage.clickOnNoServer();
    const budgetPage = await configurationPage.importBudget(
      'Actual',
      path.resolve(__dirname, 'data/actual-demo-budget.zip'),
    );

    await expect(budgetPage.budgetTable).toBeVisible({ timeout: 20_000 });

    const accountPage = await navigation.goToAccountPage('Ally Savings');
    await expect(accountPage.accountBalance).toHaveText('1,772.80');

    await navigation.goToAccountPage('Roth IRA');
    await expect(accountPage.accountBalance).toHaveText('2,745.81');
  });

  test('creates a new empty budget file', async () => {
    await configurationPage.clickOnNoServer();
    await configurationPage.startFresh();

    const accountPage = new AccountPage(page);
    await expect(accountPage.accountName).toBeVisible();
    await expect(accountPage.accountName).toHaveText('All Accounts');
    await expect(accountPage.accountBalance).toHaveText('0.00');
  });

  test('navigates back to start page by clicking on “no server” in an empty budget file', async () => {
    await configurationPage.clickOnNoServer();
    await configurationPage.startFresh();

    await navigation.clickOnNoServer();
    await page.getByRole('button', { name: 'Start using a server' }).click();

    await expect(configurationPage.heading).toHaveText('Where’s the server?');
  });
});

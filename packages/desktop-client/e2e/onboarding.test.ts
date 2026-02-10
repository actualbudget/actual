import path from 'path';

import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Onboarding', () => {
  let page: Page;
  let navigation: Navigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await expect(configurationPage.heading).toHaveText("Where's the server?");
    await expect(page).toMatchThemeScreenshots();

    await configurationPage.clickOnNoServer();
    await expect(page).toMatchThemeScreenshots();
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
    await expect(accountPage.accountBalance).toHaveText('2,600.00');

    await navigation.goToAccountPage('Saving');
    await expect(accountPage.accountBalance).toHaveText('250.00');

    await navigation.goToSchedulesPage();
    const scheduleRows = page.getByTestId('table').getByTestId('row');
    const scheduleNames = [
      'Scheduled - repeated every four weeks',
      'Scheduled - repeated every other week',
      'Scheduled - repeated every other year',
      'Scheduled - repeated every four months',
      'Scheduled - repeated twice a month',
      'Scheduled - repeated monthly',
      'Scheduled - repeated weekly',
      'Scheduled - not repeated',
      'Scheduled - repeated twice a year',
      'Scheduled - repeated yearly',
      'Scheduled - repeated every other month',
      'Scheduled - repeated every three months',
      'Scheduled - repeated daily',
      'Scheduled - split categories monthly',
      'Scheduled - transfer to Saving',
    ];

    for (const scheduleName of scheduleNames) {
      await expect(scheduleRows.filter({ hasText: scheduleName })).toHaveCount(
        1,
      );
    }
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

  test('navigates back to start page by clicking on "no server" in an empty budget file', async () => {
    await configurationPage.clickOnNoServer();
    const accountPage = await configurationPage.startFresh();

    await expect(accountPage.transactionTable).toBeVisible();

    await navigation.clickOnNoServer();
    await page.getByRole('button', { name: 'Start using a server' }).click();

    await expect(configurationPage.heading).toHaveText("Where's the server?");
  });
});

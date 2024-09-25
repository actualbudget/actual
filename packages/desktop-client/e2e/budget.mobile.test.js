import { test, expect } from '@playwright/test';

import * as monthUtils from 'loot-core/src/shared/months';

import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

const budgetTypes = ['Envelope', 'Tracking'];

budgetTypes.forEach(budgetType => {
  test.describe(`Mobile Budget [${budgetType}]`, () => {
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

      if (budgetType === 'Tracking') {
        // Set budget type to tracking
        const settingsPage = await navigation.goToSettingsPage();
        await settingsPage.useBudgetType('tracking');
      }
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
        'Starting Balances',
        'Misc',
        'Income',
      ]);
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking the budgeted cell opens the budget menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await expect(budgetPage.budgetTable).toBeVisible();

      await budgetPage.openBudgetMenu('Food');

      const budgetMenuModal = page.getByTestId('envelope-budget-menu-modal');
      await expect(budgetMenuModal).toHaveTitle('Food');
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking spent cell redirects to the category transactions page', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await expect(budgetPage.budgetTable).toBeVisible();

      const accountPage = await budgetPage.openSpentPage('Food');

      await expect(accountPage.heading).toHaveText('Food');
      await expect(accountPage.transactionList).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking the balance button opens the balance menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await expect(budgetPage.budgetTable).toBeVisible();

      await budgetPage.openBalanceMenu('Food');

      const balanceMenuModal = page.getByTestId('envelope-balance-menu-modal');
      await expect(balanceMenuModal).toHaveTitle('Food');
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking the month in the page header opens the month menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await expect(budgetPage.budgetTable).toBeVisible();

      await budgetPage.openMonthMenu();

      const monthMenuModal = page.getByTestId(
        'envelope-budget-month-menu-modal',
      );

      const currentMonth = monthUtils.currentMonth();
      const monthTitle = monthUtils.format(currentMonth, 'MMMM ‘yy');

      await expect(monthMenuModal).toHaveTitle(monthTitle);
      await expect(page).toMatchThemeScreenshots();
    });

    test('updates the budgeted amount', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await expect(budgetPage.budgetTable).toBeVisible();

      // Set to 100.00
      await budgetPage.setBudget('Food', 10000);

      const budgetedButton = await budgetPage.getBudgetedButton('Food');

      await expect(budgetedButton).toHaveText('100.00');
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking the To Budget/Overbudgeted amount opens the budget summary menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      await budgetPage.openEnvelopeBudgetSummaryMenu();

      const summaryModal = page.getByTestId('envelope-budget-summary-modal');
      await expect(summaryModal).toHaveTitle('Budget Summary');
      await expect(page).toMatchThemeScreenshots();
    });
  });
});

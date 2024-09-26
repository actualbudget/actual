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
    let previousGlobalIsTesting;

    test.beforeAll(() => {
      // TODO: Hack, properly mock the currentMonth function
      previousGlobalIsTesting = global.IS_TESTING;
      global.IS_TESTING = true;
    });

    test.afterAll(() => {
      // TODO: Hack, properly mock the currentMonth function
      global.IS_TESTING = previousGlobalIsTesting;
    });

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
      await expect(budgetPage.budgetTable).toBeVisible({
        timeout: 10000,
      });

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
      await expect(budgetPage.budgetTable).toBeVisible({
        timeout: 10000,
      });

      const categoryName = 'Food';
      await budgetPage.openBudgetMenu(categoryName);

      const budgetMenuModal = page.getByRole('dialog');
      const budgetMenuModalTitle = budgetMenuModal.getByLabel('Modal title');

      await expect(budgetMenuModalTitle).toHaveText(categoryName);
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking spent cell redirects to the category transactions page', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await expect(budgetPage.budgetTable).toBeVisible({
        timeout: 10000,
      });

      const categoryName = 'Food';
      const accountPage = await budgetPage.openSpentPage(categoryName);

      await expect(accountPage.heading).toContainText(categoryName);
      await expect(accountPage.transactionList).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking the balance button opens the balance menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await expect(budgetPage.budgetTable).toBeVisible({
        timeout: 10000,
      });

      const categoryName = 'Food';
      await budgetPage.openBalanceMenu(categoryName);

      const balanceMenuModal = page.getByRole('dialog');
      const balanceMenuModalTitle = balanceMenuModal.getByLabel('Modal title');

      await expect(balanceMenuModalTitle).toHaveText(categoryName);
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking the month in the page header opens the month menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await expect(budgetPage.budgetTable).toBeVisible({
        timeout: 10000,
      });

      await budgetPage.openMonthMenu();
      const currentMonth = monthUtils.currentMonth();
      const displayMonth = monthUtils.format(currentMonth, 'MMMM ‘yy');

      const monthMenuModal = page.getByRole('dialog');
      const monthMenuModalTitle = monthMenuModal.getByLabel('Modal title');

      await expect(monthMenuModalTitle).toHaveText(displayMonth);
      await expect(page).toMatchThemeScreenshots();
    });

    test('updates the budgeted amount', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await expect(budgetPage.budgetTable).toBeVisible({
        timeout: 10000,
      });

      const categoryName = 'Food';

      // Set to 100.00
      await budgetPage.setBudget(categoryName, 10000);

      const budgetedButton = await budgetPage.getBudgetedButton(categoryName);

      await expect(budgetedButton).toHaveText('100.00');
      await expect(page).toMatchThemeScreenshots();
    });

    if (budgetType === 'Envelope') {
      test('checks that clicking the To Budget/Overbudgeted amount opens the budget summary menu modal', async () => {
        const budgetPage = await navigation.goToBudgetPage();

        await expect(budgetPage.budgetTable).toBeVisible({
          timeout: 10000,
        });

        await budgetPage.openEnvelopeBudgetSummaryMenu();

        const summaryModal = page.getByRole('dialog');
        const summaryModalTitle = summaryModal.getByLabel('Modal title');

        await expect(summaryModalTitle).toHaveText('Budget Summary');
        await expect(page).toMatchThemeScreenshots();
      });
    }

    if (budgetType === 'Tracking') {
      test('checks that clicking the Saved/Projected Savings/Overspent amount opens the budget summary menu modal', async () => {
        const budgetPage = await navigation.goToBudgetPage();

        await expect(budgetPage.budgetTable).toBeVisible({
          timeout: 10000,
        });

        await budgetPage.openTrackingBudgetSummaryMenu();

        const summaryModal = page.getByRole('dialog');
        const summaryModalTitle = summaryModal.getByLabel('Modal title');

        await expect(summaryModalTitle).toHaveText('Budget Summary');
        await expect(page).toMatchThemeScreenshots();
      });
    }
  });
});

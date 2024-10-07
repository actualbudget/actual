import { test, expect } from '@playwright/test';

import { amountToCurrency, currencyToAmount } from 'loot-core/shared/util';
import * as monthUtils from 'loot-core/src/shared/months';

import { ConfigurationPage } from './page-models/configuration-page';
import { MobileNavigation } from './page-models/mobile-navigation';

const copyLastMonthBudget = async (budgetPage, categoryName) => {
  const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
  await budgetMenuModal.copyLastMonthBudget();
  await budgetMenuModal.close();
};

const setTo3MonthAverage = async (budgetPage, categoryName) => {
  const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
  await budgetMenuModal.setTo3MonthAverage();
  await budgetMenuModal.close();
};

const setTo6MonthAverage = async (budgetPage, categoryName) => {
  const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
  await budgetMenuModal.setTo6MonthAverage();
  await budgetMenuModal.close();
};

const setToYearlyAverage = async (budgetPage, categoryName) => {
  const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
  await budgetMenuModal.setToYearlyAverage();
  await budgetMenuModal.close();
};

async function setBudgetAverage(
  budgetPage,
  categoryName,
  numberOfMonths,
  setBudgetAverageFn,
) {
  let totalSpent = 0;

  for (let i = 0; i < numberOfMonths; i++) {
    await budgetPage.goToPreviousMonth();
    const spentButton = await budgetPage.getButtonForSpent(categoryName);
    const spent = await spentButton.textContent();
    totalSpent += currencyToAmount(spent);
  }

  // Calculate average amount
  const averageSpent = totalSpent / numberOfMonths;

  // Go back to the current month
  for (let i = 0; i < numberOfMonths; i++) {
    await budgetPage.goToNextMonth();
  }

  await setBudgetAverageFn(budgetPage, categoryName, numberOfMonths);

  return averageSpent;
}

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
      await budgetPage.waitForBudgetTable();

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

    // Page Header Tests

    test('checks that clicking the Actual logo in the page header opens the budget page menu', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      await budgetPage.openBudgetPageMenu();

      const budgetPageMenuModal = page.getByRole('dialog');

      await expect(budgetPageMenuModal).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test("checks that clicking the left arrow in the page header shows the previous month's budget", async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const selectedMonth = await budgetPage.getSelectedMonth();
      const displayMonth = monthUtils.format(
        selectedMonth,
        budgetPage.MONTH_HEADER_DATE_FORMAT,
      );

      await expect(budgetPage.heading).toHaveText(displayMonth);

      const previousMonth = await budgetPage.goToPreviousMonth();
      const previousDisplayMonth = monthUtils.format(
        previousMonth,
        budgetPage.MONTH_HEADER_DATE_FORMAT,
      );

      await expect(budgetPage.heading).toHaveText(previousDisplayMonth);
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking the month in the page header opens the month menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const selectedMonth = await budgetPage.getSelectedMonth();

      await budgetPage.openMonthMenu();

      const monthMenuModal = page.getByRole('dialog');
      const monthMenuModalHeading = monthMenuModal.getByRole('heading');

      const displayMonth = monthUtils.format(
        selectedMonth,
        budgetPage.MONTH_HEADER_DATE_FORMAT,
      );
      await expect(monthMenuModalHeading).toHaveText(displayMonth);
      await expect(page).toMatchThemeScreenshots();
    });

    test("checks that clicking the right arrow in the page header shows the next month's budget", async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const selectedMonth = await budgetPage.getSelectedMonth();
      const displayMonth = monthUtils.format(
        selectedMonth,
        budgetPage.MONTH_HEADER_DATE_FORMAT,
      );

      await expect(budgetPage.heading).toHaveText(displayMonth);

      const nextMonth = await budgetPage.goToNextMonth();
      const nextDisplayMonth = monthUtils.format(
        nextMonth,
        budgetPage.MONTH_HEADER_DATE_FORMAT,
      );

      await expect(budgetPage.heading).toHaveText(nextDisplayMonth);
      await expect(page).toMatchThemeScreenshots();
    });

    // Category / Category Group Menu Tests

    test('checks that clicking the category group name opens the category group menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const categoryGroupName = await budgetPage.getCategoryGroupNameForRow(0);
      await budgetPage.openCategoryGroupMenu(categoryGroupName);

      const categoryMenuModalHeading = page
        .getByRole('dialog')
        .getByRole('heading');

      await expect(categoryMenuModalHeading).toHaveText(categoryGroupName);
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking the category name opens the category menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      await budgetPage.openCategoryMenu(categoryName);

      const categoryMenuModalHeading = page
        .getByRole('dialog')
        .getByRole('heading');

      await expect(categoryMenuModalHeading).toHaveText(categoryName);
      await expect(page).toMatchThemeScreenshots();
    });

    // Budgeted Cell Tests

    test('checks that clicking the budgeted cell opens the budget menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      await budgetPage.openBudgetMenu(categoryName);

      const budgetMenuModalHeading = page
        .getByRole('dialog')
        .getByRole('heading');

      await expect(budgetMenuModalHeading).toHaveText(categoryName);
      await expect(page).toMatchThemeScreenshots();
    });

    test('updates the budgeted amount', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);

      const budgetAmount = 123;

      // Set to 123.00
      await budgetMenuModal.setBudgetAmount(`${budgetAmount}00`);

      const budgetedButton =
        await budgetPage.getButtonForBudgeted(categoryName);

      await expect(budgetedButton).toHaveText(amountToCurrency(budgetAmount));
      await expect(page).toMatchThemeScreenshots();
    });

    test(`copies last month's budget`, async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const categoryName = await budgetPage.getCategoryNameForRow(3);
      const budgetedButton =
        await budgetPage.getButtonForBudgeted(categoryName);

      await budgetPage.goToPreviousMonth();

      const lastMonthBudget = await budgetedButton.textContent();

      await budgetPage.goToNextMonth();

      await copyLastMonthBudget(budgetPage, categoryName);

      await expect(budgetedButton).toHaveText(lastMonthBudget);
      await expect(page).toMatchThemeScreenshots();
    });

    [
      [3, setTo3MonthAverage],
      [6, setTo6MonthAverage],
      [12, setToYearlyAverage],
    ].forEach(([numberOfMonths, setBudgetAverageFn]) => {
      test(`set budget to ${numberOfMonths} month average`, async () => {
        const budgetPage = await navigation.goToBudgetPage();
        await budgetPage.waitForBudgetTable();

        const categoryName = await budgetPage.getCategoryNameForRow(3);

        const averageSpent = await setBudgetAverage(
          budgetPage,
          categoryName,
          numberOfMonths,
          setBudgetAverageFn,
        );

        const budgetedButton =
          await budgetPage.getButtonForBudgeted(categoryName);

        await expect(budgetedButton).toHaveText(
          amountToCurrency(Math.abs(averageSpent)),
        );
        await expect(page).toMatchThemeScreenshots();
      });
    });

    test(`applies budget template`, async () => {
      const settingsPage = await navigation.goToSettingsPage();
      await settingsPage.enableExperimentalFeature('Goal templates');

      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const categoryName = await budgetPage.getCategoryNameForRow(1);

      const amountToTemplate = 123;

      const categoryMenuModal = await budgetPage.openCategoryMenu(categoryName);
      const editNotesModal = await categoryMenuModal.editNotes();
      await editNotesModal.updateNotes(`#template ${amountToTemplate}`);
      await editNotesModal.close();

      const budgetedButton =
        await budgetPage.getButtonForBudgeted(categoryName);

      const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
      await budgetMenuModal.applyBudgetTemplate();
      await budgetMenuModal.close();

      await expect(budgetedButton).toHaveText(
        amountToCurrency(amountToTemplate),
      );
      await expect(page).toMatchThemeScreenshots();
    });

    // Spent Cell Tests

    test('checks that clicking spent cell redirects to the category transactions page', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const accountPage = await budgetPage.openSpentPage(categoryName);

      await expect(accountPage.heading).toContainText(categoryName);
      await expect(accountPage.transactionList).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    // Balance Cell Tests

    test('checks that clicking the balance cell opens the balance menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();
      await budgetPage.waitForBudgetTable();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      await budgetPage.openBalanceMenu(categoryName);

      const balanceMenuModalHeading = page
        .getByRole('dialog')
        .getByRole('heading');

      await expect(balanceMenuModalHeading).toHaveText(categoryName);
      await expect(page).toMatchThemeScreenshots();
    });

    if (budgetType === 'Envelope') {
      test('checks that clicking the To Budget/Overbudgeted amount opens the budget summary menu modal', async () => {
        const budgetPage = await navigation.goToBudgetPage();
        await budgetPage.waitForBudgetTable();

        await budgetPage.openEnvelopeBudgetSummaryMenu();

        const summaryModalHeading = page
          .getByRole('dialog')
          .getByRole('heading');

        await expect(summaryModalHeading).toHaveText('Budget Summary');
        await expect(page).toMatchThemeScreenshots();
      });
    }

    if (budgetType === 'Tracking') {
      test('checks that clicking the Saved/Projected Savings/Overspent amount opens the budget summary menu modal', async () => {
        const budgetPage = await navigation.goToBudgetPage();
        await budgetPage.waitForBudgetTable();

        await budgetPage.openTrackingBudgetSummaryMenu();

        const summaryModalHeading = page
          .getByRole('dialog')
          .getByRole('heading');

        await expect(summaryModalHeading).toHaveText('Budget Summary');
        await expect(page).toMatchThemeScreenshots();
      });
    }
  });
});

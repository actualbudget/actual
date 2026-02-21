import type { Page } from '@playwright/test';

import * as monthUtils from 'loot-core/shared/months';
import { amountToCurrency, currencyToAmount } from 'loot-core/shared/util';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import type { MobileBudgetPage } from './page-models/mobile-budget-page';
import { MobileNavigation } from './page-models/mobile-navigation';

const copyLastMonthBudget = async (
  budgetPage: MobileBudgetPage,
  categoryName: string,
) => {
  const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
  await budgetMenuModal.copyLastMonthBudget();
  await budgetMenuModal.close();
};

const setTo3MonthAverage = async (
  budgetPage: MobileBudgetPage,
  categoryName: string,
) => {
  const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
  await budgetMenuModal.setTo3MonthAverage();
  await budgetMenuModal.close();
};

const setTo6MonthAverage = async (
  budgetPage: MobileBudgetPage,
  categoryName: string,
) => {
  const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
  await budgetMenuModal.setTo6MonthAverage();
  await budgetMenuModal.close();
};

const setToYearlyAverage = async (
  budgetPage: MobileBudgetPage,
  categoryName: string,
) => {
  const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
  await budgetMenuModal.setToYearlyAverage();
  await budgetMenuModal.close();
};

async function setBudgetAverage(
  budgetPage: MobileBudgetPage,
  categoryName: string,
  numberOfMonths: number,
  setBudgetAverageFn: (
    budgetPage: MobileBudgetPage,
    categoryName: string,
    numberOfMonths: number,
  ) => Promise<void>,
) {
  let totalSpent = 0;

  for (let i = 0; i < numberOfMonths; i++) {
    await budgetPage.goToPreviousMonth();
    const spentButton = await budgetPage.getButtonForSpent(categoryName);
    const spent = await spentButton.textContent();
    if (!spent) {
      throw new Error('Failed to get spent amount');
    }
    totalSpent += currencyToAmount(spent) ?? 0;
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

const budgetTypes = ['Envelope', 'Tracking'] as const;

budgetTypes.forEach(budgetType => {
  test.describe(`Mobile Budget [${budgetType}]`, () => {
    let page: Page;
    let navigation: MobileNavigation;
    let configurationPage: ConfigurationPage;
    let previousGlobalIsTesting: boolean;

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

      const settingsPage = await navigation.goToSettingsPage();
      await settingsPage.useBudgetType(budgetType);
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

    // Page Header Tests

    test('checks that clicking the Actual logo in the page header opens the budget page menu', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      await budgetPage.openBudgetPageMenu();

      const budgetPageMenuModal = page.getByRole('dialog');

      await expect(budgetPageMenuModal).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test("checks that clicking the left arrow in the page header shows the previous month's budget", async () => {
      const budgetPage = await navigation.goToBudgetPage();

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

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const categoryMenuModal = await budgetPage.openCategoryMenu(categoryName);

      await expect(categoryMenuModal.heading).toHaveText(categoryName);
      await expect(page).toMatchThemeScreenshots();
    });

    // Budgeted Cell Tests

    test('checks that clicking the budgeted cell opens the budget menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);

      await expect(budgetMenuModal.heading).toHaveText(categoryName);
      await expect(page).toMatchThemeScreenshots();
    });

    test('updates the budgeted amount', async () => {
      const budgetPage = await navigation.goToBudgetPage();

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

      const categoryName = await budgetPage.getCategoryNameForRow(3);
      const budgetedButton =
        await budgetPage.getButtonForBudgeted(categoryName);

      await budgetPage.goToPreviousMonth();

      const lastMonthBudget = await budgetedButton.textContent();

      if (!lastMonthBudget) {
        throw new Error('Failed to get last month budget');
      }

      await budgetPage.goToNextMonth();

      await copyLastMonthBudget(budgetPage, categoryName);

      await expect(budgetedButton).toHaveText(lastMonthBudget);
      await expect(page).toMatchThemeScreenshots();
    });

    (
      [
        [3, setTo3MonthAverage],
        [6, setTo6MonthAverage],
        [12, setToYearlyAverage],
      ] as const
    ).forEach(([numberOfMonths, setBudgetAverageFn]) => {
      test(`set budget to ${numberOfMonths} month average`, async () => {
        const budgetPage = await navigation.goToBudgetPage();

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

      const categoryName = await budgetPage.getCategoryNameForRow(1);

      const amountToTemplate = 123;

      const categoryMenuModal = await budgetPage.openCategoryMenu(categoryName);
      const editNotesModal = await categoryMenuModal.editNotes();
      const templateNotes = `#template ${amountToTemplate}`;
      await editNotesModal.updateNotes(templateNotes);
      await editNotesModal.close();

      const budgetedButton =
        await budgetPage.getButtonForBudgeted(categoryName);

      const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
      await budgetMenuModal.applyBudgetTemplate();
      await budgetMenuModal.close();

      await expect(budgetedButton).toHaveText(
        amountToCurrency(amountToTemplate),
      );
      const templateNotification = page.getByRole('alert').nth(1);
      await expect(templateNotification).toContainText(templateNotes);
      await expect(page).toMatchThemeScreenshots();
    });

    // Spent Cell Tests

    test('checks that clicking spent cell redirects to the category transactions page', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const accountPage = await budgetPage.openSpentPage(categoryName);

      await expect(accountPage.heading).toContainText(categoryName);
      await expect(accountPage.transactionList).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    // Balance Cell Tests

    test('checks that clicking the balance cell opens the balance menu modal', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const balanceMenuModal = await budgetPage.openBalanceMenu(categoryName);

      await expect(balanceMenuModal.heading).toHaveText(categoryName);
      await expect(page).toMatchThemeScreenshots();
    });

    if (budgetType === 'Envelope') {
      test('checks that clicking the To Budget/Overbudgeted amount opens the budget summary menu modal', async () => {
        const budgetPage = await navigation.goToBudgetPage();

        const envelopeBudgetSummaryModal =
          await budgetPage.openEnvelopeBudgetSummary();

        await expect(envelopeBudgetSummaryModal.heading).toHaveText(
          'Budget Summary',
        );
        await expect(page).toMatchThemeScreenshots();
      });
    }

    if (budgetType === 'Tracking') {
      test('checks that clicking the Saved/Projected Savings/Overspent amount opens the budget summary menu modal', async () => {
        const budgetPage = await navigation.goToBudgetPage();

        const trackingBudgetSummaryModal =
          await budgetPage.openTrackingBudgetSummary();

        await expect(trackingBudgetSummaryModal.heading).toHaveText(
          'Budget Summary',
        );
        await expect(page).toMatchThemeScreenshots();
      });
    }
  });
});

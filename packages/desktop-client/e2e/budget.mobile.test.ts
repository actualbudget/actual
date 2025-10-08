import { type Page } from '@playwright/test';

import * as monthUtils from 'loot-core/shared/months';
import { amountToCurrency, currencyToAmount } from 'loot-core/shared/util';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { type MobileBudgetPage } from './page-models/mobile-budget-page';
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

      debugger;
      navigation = new MobileNavigation(page);
      configurationPage = new ConfigurationPage(page);

      await page.setViewportSize({
        width: 350,
        height: 600,
      });
      await page.goto('/');
      await configurationPage.createTestFile();

      // const settingsPage = await navigation.goToSettingsPage();
      // await settingsPage.useBudgetType(budgetType);
    });

    test.afterEach(async () => {
      await page.close();
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
      // await expect(page).toMatchThemeScreenshots();
    });
  });
});

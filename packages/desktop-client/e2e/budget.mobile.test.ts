import * as monthUtils from '@actual-app/core/shared/months';
import {
  amountToCurrency,
  currencyToAmount,
} from '@actual-app/core/shared/util';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import type { MobileBudgetPage } from './page-models/mobile-budget-page';
import type { CategoryActionsSheet } from './page-models/mobile-category-actions-sheet';
import { MobileCategoryPage } from './page-models/mobile-category-page';
import { MobileNavigation } from './page-models/mobile-navigation';

const runCategoryAction = async (
  budgetPage: MobileBudgetPage,
  categoryName: string,
  action: (actionsSheet: CategoryActionsSheet) => Promise<void>,
) => {
  const categoryPage = await budgetPage.openCategory(categoryName);
  const actionsSheet = await categoryPage.openActions();
  await action(actionsSheet);
  await categoryPage.goBack();
  await budgetPage.waitFor();
};

const copyLastMonthBudget = async (
  budgetPage: MobileBudgetPage,
  categoryName: string,
) => {
  await runCategoryAction(budgetPage, categoryName, actionsSheet =>
    actionsSheet.copyLastMonthBudget(),
  );
};

const setTo3MonthAverage = async (
  budgetPage: MobileBudgetPage,
  categoryName: string,
) => {
  await runCategoryAction(budgetPage, categoryName, actionsSheet =>
    actionsSheet.setTo3MonthAverage(),
  );
};

const setTo6MonthAverage = async (
  budgetPage: MobileBudgetPage,
  categoryName: string,
) => {
  await runCategoryAction(budgetPage, categoryName, actionsSheet =>
    actionsSheet.setTo6MonthAverage(),
  );
};

const setToYearlyAverage = async (
  budgetPage: MobileBudgetPage,
  categoryName: string,
) => {
  await runCategoryAction(budgetPage, categoryName, actionsSheet =>
    actionsSheet.setToYearlyAverage(),
  );
};

function getAverageStartMonth(month: string) {
  const previousMonth = monthUtils.prevMonth(month);

  if (previousMonth >= monthUtils.currentMonth()) {
    return monthUtils.prevMonth(monthUtils.currentMonth());
  }

  return previousMonth;
}

async function getAverageMonthAmounts(
  budgetPage: MobileBudgetPage,
  categoryName: string,
  numberOfMonths: number,
) {
  const averageStartMonth = getAverageStartMonth(
    await budgetPage.getSelectedMonth(),
  );
  const amounts: number[] = [];
  let selectedMonth = await budgetPage.getSelectedMonth();
  let navigatedMonths = 0;

  while (selectedMonth > averageStartMonth) {
    selectedMonth = await budgetPage.goToPreviousMonth();
    navigatedMonths++;
  }

  for (let i = 0; i < numberOfMonths; i++) {
    const spentButton = await budgetPage.getButtonForSpent(categoryName);
    const spent = await spentButton.textContent();

    if (!spent) {
      throw new Error('Failed to get average month amounts');
    }

    amounts.push(currencyToAmount(spent) ?? 0);

    if (i < numberOfMonths - 1) {
      selectedMonth = await budgetPage.goToPreviousMonth();
      navigatedMonths++;
    }
  }

  for (let i = 0; i < navigatedMonths; i++) {
    await budgetPage.goToNextMonth();
  }

  return amounts;
}

function getAverageSpent(amounts: number[]) {
  let oldestActivityIndex = -1;

  for (let i = 0; i < amounts.length; i++) {
    if (amounts[i] !== 0) {
      oldestActivityIndex = i;
    }
  }

  const averageMonths =
    oldestActivityIndex === -1
      ? amounts
      : amounts.slice(0, oldestActivityIndex + 1);
  const totalSpent = averageMonths.reduce((sum, spentAmount) => {
    return sum + spentAmount;
  }, 0);

  return Math.round((totalSpent / averageMonths.length) * 100) / 100;
}

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
  const averageSpent = getAverageSpent(
    await getAverageMonthAmounts(budgetPage, categoryName, numberOfMonths),
  );

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

    test('checks that clicking the month in the page header opens the month picker', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const selectedMonth = await budgetPage.getSelectedMonth();

      await budgetPage.openMonthMenu();

      const monthPicker = page.getByRole('dialog');

      await expect(monthPicker.getByText('Select month')).toBeVisible();
      await expect(
        monthPicker.locator(`[data-month="${selectedMonth}"]`),
      ).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test('selects a month from the month picker', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const selectedMonth = await budgetPage.getSelectedMonth();
      const targetMonth = monthUtils.nextMonth(selectedMonth);
      const yearDifference =
        Number(monthUtils.getYear(targetMonth)) -
        Number(monthUtils.getYear(selectedMonth));

      await budgetPage.openMonthMenu();

      const monthPicker = page.getByRole('dialog');
      for (let i = 0; i < Math.abs(yearDifference); i++) {
        await monthPicker
          .getByRole('button', {
            name: yearDifference > 0 ? 'Next year' : 'Previous year',
          })
          .click();
      }
      await monthPicker.locator(`[data-month="${targetMonth}"]`).click();

      await expect(budgetPage.heading.locator('[data-month]')).toHaveAttribute(
        'data-month',
        targetMonth,
      );
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

    // Category / Category Group Tests

    test('checks that clicking the category group name opens the category group actions', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryGroupName = await budgetPage.getCategoryGroupNameForRow(0);
      const categoryGroupActions =
        await budgetPage.openCategoryGroupActions(categoryGroupName);

      await expect(categoryGroupActions.heading).toHaveText(categoryGroupName);
      await expect(categoryGroupActions.addCategoryRow).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test('checks that clicking the category name opens the category page', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const categoryPage = await budgetPage.openCategory(categoryName);

      await expect(categoryPage.heading).toContainText(categoryName);
      await expect(categoryPage.balance).toBeVisible();
      await expect(categoryPage.transactionList).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test('moves a category to another group with drag and drop', async () => {
      // Keep both rows on screen so the drag doesn't scroll the page midway.
      await page.setViewportSize({ width: 350, height: 1000 });
      const budgetPage = await navigation.goToBudgetPage();

      await budgetPage.dragCategoryBefore('Gift', 'Internet');

      await expect(
        page
          .getByRole('grid', { name: 'Bills expense group categories' })
          .getByTestId('category-name'),
      ).toHaveText(['Cell', 'Gift', 'Internet', 'Mortgage', 'Water', 'Power']);
    });

    test('checks that clicking anywhere on the row opens the category page', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      await budgetPage.categoryRows.first().click({ position: { x: 4, y: 4 } });

      const categoryPage = new MobileCategoryPage(page);
      await categoryPage.waitFor();
      await expect(categoryPage.heading).toContainText(categoryName);
    });

    test('opens the category actions with a long press on the row', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const actionsSheet =
        await budgetPage.openCategoryActionsWithLongPress(categoryName);

      await expect(actionsSheet.locator).toContainText(categoryName);
      await expect(actionsSheet.editBudgetedAmountRow).toBeVisible();

      await actionsSheet.close();
      await budgetPage.waitFor();
    });

    test('keeps a long category name inside the name column', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const longName = `${categoryName} with a very long name that keeps going`;
      await runCategoryAction(budgetPage, categoryName, async actionsSheet => {
        await actionsSheet.renameRow.click();
        const nameInput = actionsSheet.locator.getByRole('textbox', {
          name: 'Name',
        });
        await nameInput.fill(longName);
        await nameInput.press('Enter');
        await actionsSheet.close();
      });

      const nameButton = budgetPage.categoryRows
        .first()
        .getByTestId('category-name');
      const budgetedButton = await budgetPage.getButtonForBudgeted(longName);
      const nameBox = await nameButton.boundingBox();
      const budgetedBox = await budgetedButton.boundingBox();

      expect(nameBox).not.toBeNull();
      expect(budgetedBox).not.toBeNull();
      expect(nameBox!.x + nameBox!.width).toBeLessThanOrEqual(budgetedBox!.x);
    });

    test('reorders categories with the handle in reorder mode', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const firstName = await budgetPage.getCategoryNameForRow(0);
      const secondName = await budgetPage.getCategoryNameForRow(1);

      await budgetPage.enterReorderMode();
      await budgetPage.dragCategoryToRow(1, 0);

      await expect(budgetPage.categoryNames.nth(0)).toHaveText(secondName);
      await expect(budgetPage.categoryNames.nth(1)).toHaveText(firstName);

      const rowCount = await budgetPage.categoryRows.count();
      await budgetPage.tapGroupHandle(0);
      await expect(budgetPage.categoryRows).toHaveCount(rowCount);

      await budgetPage.exitReorderMode();
    });

    test('moves a category to another group in reorder mode', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const firstGroup = await budgetPage.getCategoryGroupNameForRow(0);
      const secondGroup = await budgetPage.getCategoryGroupNameForRow(1);
      const firstGroupNames = budgetPage.getGroupCategoryNames(firstGroup);
      const secondGroupNames = budgetPage.getGroupCategoryNames(secondGroup);
      const firstGroupCount = await firstGroupNames.count();
      const movedName = await secondGroupNames.first().textContent();
      expect(movedName).not.toBeNull();

      await budgetPage.enterReorderMode();
      await budgetPage.dragCategoryToRow(firstGroupCount, firstGroupCount - 1);

      await expect(firstGroupNames.nth(firstGroupCount - 1)).toHaveText(
        movedName!,
      );
      await expect(firstGroupNames).toHaveCount(firstGroupCount + 1);
      await expect(secondGroupNames.first()).not.toHaveText(movedName!);

      await budgetPage.exitReorderMode();
    });

    test('checks that the category menu opens from the category page', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const categoryPage = await budgetPage.openCategory(categoryName);
      const actionsSheet = await categoryPage.openActions();

      await expect(actionsSheet.locator).toContainText(categoryName);
      await expect(actionsSheet.editBudgetedAmountRow).toBeVisible();
      await expect(actionsSheet.deleteCategoryRow).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test('renames a category from the category page', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const categoryPage = await budgetPage.openCategory(categoryName);
      const actionsSheet = await categoryPage.openActions();
      await actionsSheet.renameRow.click();

      const nameInput = actionsSheet.locator.getByRole('textbox', {
        name: 'Name',
      });
      await nameInput.fill(`${categoryName} renamed`);
      await nameInput.press('Enter');
      await actionsSheet.close();

      await expect(categoryPage.heading).toContainText(
        `${categoryName} renamed`,
      );
    });

    test('opens the transfer confirmation when deleting a category group with transactions', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryGroupName = await budgetPage.getCategoryGroupNameForRow(0);
      const categoryGroupActions =
        await budgetPage.openCategoryGroupActions(categoryGroupName);

      await categoryGroupActions.delete();

      await expect(categoryGroupActions.locator).toContainText(
        'Are you sure you want to delete it?',
      );
      await expect(
        categoryGroupActions.locator.getByRole('button', { name: 'Category' }),
      ).toBeVisible();
    });

    test('opens the transfer confirmation when deleting a category with transactions', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const categoryPage = await budgetPage.openCategory(categoryName);
      const actionsSheet = await categoryPage.openActions();

      await actionsSheet.delete();

      await expect(actionsSheet.locator).toContainText(
        'Are you sure you want to delete it?',
      );
      await expect(
        actionsSheet.locator.getByRole('button', { name: 'Category' }),
      ).toBeVisible();
    });

    // Budgeted Cell Tests

    test('opens the budget amount sheet from the budgeted cell', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const amountSheet =
        await budgetPage.openBudgetAmountFromCell(categoryName);

      await expect(amountSheet.amountInput).toBeVisible();
      await expect(amountSheet.amountInput).toBeFocused();
      await expect(amountSheet.editNotesRow).toBeVisible();
      await expect(page).toMatchThemeScreenshots();
    });

    test('updates the budgeted amount', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(0);
      const categoryPage = await budgetPage.openCategory(categoryName);
      const budgetAmountSheet = await categoryPage.openBudgetAmount();

      const budgetAmount = 123;

      // Set to 123.00
      await budgetAmountSheet.setBudgetAmount(`${budgetAmount}00`);

      await expect(categoryPage.budgetedButton).toContainText(
        amountToCurrency(budgetAmount),
      );

      await categoryPage.goBack();
      await budgetPage.waitFor();

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
      const uiToggle = page.getByRole('checkbox', {
        name: 'Budget automations UI',
      });
      await uiToggle.waitFor({ state: 'visible' });
      if (!(await uiToggle.isChecked())) {
        await uiToggle.click();
      }

      const budgetPage = await navigation.goToBudgetPage();

      const categoryName = await budgetPage.getCategoryNameForRow(1);

      const amountToTemplate = 123;

      const categoryPage = await budgetPage.openCategory(categoryName);
      let actionsSheet = await categoryPage.openActions();
      const automationsModal = await actionsSheet.editAutomations();
      await automationsModal
        .getByRole('button', { name: 'Add an automation' })
        .click();
      const amountField = automationsModal.locator('#amount-field');
      await amountField.fill(String(amountToTemplate));
      await amountField.press('Enter');
      await automationsModal
        .getByRole('spinbutton', { name: 'Priority' })
        .fill('0');
      await automationsModal
        .getByRole('button', { name: 'Back', exact: true })
        .click();
      await automationsModal
        .getByRole('button', { name: 'Save', exact: true })
        .click();
      await expect(automationsModal).toBeHidden();

      actionsSheet = await categoryPage.openActions();
      await actionsSheet.applyBudgetTemplate();

      await categoryPage.goBack();
      await budgetPage.waitFor();

      const budgetedButton =
        await budgetPage.getButtonForBudgeted(categoryName);

      await expect(budgetedButton).toHaveText(
        amountToCurrency(amountToTemplate),
      );
      await expect(page).toMatchThemeScreenshots();
    });

    test('shows the received amount on the income category page', async () => {
      const budgetPage = await navigation.goToBudgetPage();

      const received = await budgetPage.getReceivedForIncomeCategory('Income');
      const categoryPage = await budgetPage.openCategory('Income');

      await expect(categoryPage.heading).toContainText('Income');
      await expect(categoryPage.balance).toHaveText(received);
      if (budgetType === 'Envelope') {
        await expect(categoryPage.budgetedButton).toHaveCount(0);
      } else {
        await expect(categoryPage.budgetedButton).toBeVisible();
      }
    });

    if (budgetType === 'Envelope') {
      test('toggles auto hold from the income category actions', async () => {
        const budgetPage = await navigation.goToBudgetPage();

        const categoryPage = await budgetPage.openCategory('Income');
        const actionsSheet = await categoryPage.openActions();

        await expect(actionsSheet.editBudgetedAmountRow).toHaveCount(0);
        await expect(actionsSheet.autoHoldRow).toHaveAttribute(
          'aria-pressed',
          'false',
        );
        await actionsSheet.autoHoldRow.click();
        await expect(actionsSheet.autoHoldRow).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        await actionsSheet.close();
      });
    }

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

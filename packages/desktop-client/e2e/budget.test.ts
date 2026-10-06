import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Budget', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;
  let budgetPage: BudgetPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    budgetPage = await configurationPage.createTestFile();

    // Move mouse to corner of the screen;
    // sometimes the mouse hovers on a budget element thus rendering an input box
    // and this breaks screenshot tests
    await page.mouse.move(0, 0);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('renders the summary information: available funds, overspent, budgeted and for next month', async () => {
    const summary = budgetPage.budgetSummary.first();

    await expect(summary.getByText('Available funds')).toBeVisible({
      timeout: 10000,
    });
    await expect(summary.getByText(/^Overspent in /)).toBeVisible();
    await expect(summary.getByText('Budgeted')).toBeVisible();
    await expect(summary.getByText('For next month')).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  test('transfer funds to another category', async () => {
    const currentFundsA = await budgetPage.getBalanceForRow(1);
    const currentFundsB = await budgetPage.getBalanceForRow(2);

    await budgetPage.transferAllBalance(1, 2);

    await expect
      .poll(() => budgetPage.getBalanceForRow(2))
      .toEqual(currentFundsA + currentFundsB);
    await expect(page).toMatchThemeScreenshots();
  });

  test('budget table is rendered', async () => {
    await expect(budgetPage.budgetTable).toBeVisible();
    expect(await budgetPage.getTableTotals()).toEqual({
      budgeted: expect.any(Number),
      spent: expect.any(Number),
      balance: expect.any(Number),
    });
  });

  test('clicking on spent amounts opens a transaction page', async () => {
    const accountPage = await budgetPage.clickOnSpentAmountForRow(1);
    expect(page.url()).toContain('/accounts');
    expect(await accountPage.accountName.textContent()).toMatch('All Accounts');
    await page.getByRole('button', { name: 'Back' }).click();
  });

  test('right clicking a category opens context menu', async () => {
    await budgetPage.rightClickCategory(1);
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Rename' })).toBeVisible();
  });

  test('right clicking a category group opens context menu', async () => {
    await budgetPage.rightClickCategoryGroup('Usual Expenses');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Rename' })).toBeVisible();
  });

  test('right clicking budget name opens context menu', async () => {
    await page.getByTestId('budget-name').click({ button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole('button', { name: 'Switch file' }),
    ).toBeVisible();
  });
});

test.describe('Budget scroll position', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;
  let budgetPage: BudgetPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    budgetPage = await configurationPage.createTestFile();

    // Add enough categories to make the budget table scrollable.
    const categoryCount = 20;
    await page.evaluate(async count => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const $send = (window as any).$send as (
        type: string,
        args?: unknown,
      ) => Promise<string>;
      const groupId = await $send('category-group-create', {
        name: 'Extra Categories',
      });
      for (let i = 1; i <= count; i++) {
        await $send('category-create', { name: `Category ${i}`, groupId });
      }
      // Invalidate the category query so React re-renders with the new categories.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (window as any).__TANSTACK_QUERY_CLIENT__.invalidateQueries({
        queryKey: ['categories', 'lists'],
      });
    }, categoryCount);
    await page
      .getByText(`Category ${categoryCount}`, { exact: true })
      .waitFor({ state: 'visible' });

    await page.mouse.move(0, 0);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('scroll position is restored when navigating back from spent transactions page', async () => {
    await budgetPage.scrollToBottom();
    const scrollTopBeforeViewingSpent = await budgetPage.getScrollTop();
    expect(scrollTopBeforeViewingSpent).toBeGreaterThan(0);

    // Click a spent-amount cell that is already visible at the current scroll position so the scroll does not change
    // before the handler captures it.
    await budgetPage.clickOnSpentAmountForLastVisibleRow();
    expect(page.url()).toContain('/accounts');

    await page.getByRole('button', { name: 'Back' }).click();
    await budgetPage.waitFor();

    const scrollTopAfterReturningFromSpent = await budgetPage.getScrollTop();
    expect(scrollTopAfterReturningFromSpent).toBe(scrollTopBeforeViewingSpent);
  });
});

test.describe('Redesigned budget page', () => {
  let page: Page;
  let budgetPage: BudgetPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    const configurationPage = new ConfigurationPage(page);
    const navigation = new Navigation(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    const settingsPage = await navigation.goToSettingsPage();
    await settingsPage.enableExperimentalFeature('Redesigned budget page');
    budgetPage = await navigation.goToBudgetPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('navigates between months from the toolbar', async () => {
    const initialMonth = await budgetPage.getSelectedMonth();

    const nextMonth = await budgetPage.goToNextMonth();
    expect(nextMonth).not.toEqual(initialMonth);

    await page.getByRole('button', { name: 'Today' }).click();
    await expect(budgetPage.selectedMonthButton).toHaveAttribute(
      'data-month',
      initialMonth,
    );
  });

  test('changes the number of months shown from the toolbar', async () => {
    const monthCountSelector = page.getByRole('group', {
      name: 'Choose the number of months shown at a time',
    });
    const totalBudgeted =
      budgetPage.budgetTableTotals.getByTestId(/total-budgeted$/);

    await expect(totalBudgeted).toHaveCount(1);

    await monthCountSelector.getByRole('button', { name: '2' }).click();

    await expect(totalBudgeted).toHaveCount(2);
    await expect(budgetPage.selectedMonthButton).toContainText('–');

    // With several months the expanded card shows its totals under the header
    const selectedMonth = await budgetPage.getSelectedMonth();
    const summary = page.locator(
      `[data-testid="budget-summary"][data-month="${selectedMonth}"]`,
    );
    await expect(summary.getByText('Available funds')).toBeVisible();

    await summary.getByRole('button', { name: 'Menu' }).click();
    await page.getByText('Hide summary details').click();
    await expect(summary.getByText('Available funds')).toBeHidden();

    await summary.getByRole('button', { name: 'Menu' }).click();
    await page.getByText('Show summary details').click();
    await expect(summary.getByText('Available funds')).toBeVisible();
  });

  test('collapses the month summary into a single row', async () => {
    const selectedMonth = await budgetPage.getSelectedMonth();
    const summary = page.locator(
      `[data-testid="budget-summary"][data-month="${selectedMonth}"]`,
    );

    await expect(summary.getByText('Available funds')).toBeVisible();
    await expect(summary.getByText('Budget actions')).toBeVisible();
    await expect(summary.getByText(/^of .+ budgeted$/)).toBeVisible();

    await summary.getByRole('button', { name: 'Choose an action' }).click();
    await page.getByText('Hide summary details').click();

    await expect(summary.getByText('Available funds')).toBeHidden();
    await expect(summary.getByText('To Budget:')).toBeVisible();
    await expect(summary.getByTestId('month-status-badge')).toHaveText('Now');

    await summary.getByRole('button', { name: 'Menu' }).click();
    await page.getByText('Show summary details').click();

    await expect(summary.getByText('Available funds')).toBeVisible();
  });
});

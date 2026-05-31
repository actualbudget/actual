import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import type { BudgetPage } from './page-models/budget-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

test.describe('Budget', () => {
  let page: Page;
  let navigation: Navigation;
  let configurationPage: ConfigurationPage;
  let budgetPage: BudgetPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
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
    await page.waitForTimeout(1000);

    expect(await budgetPage.getBalanceForRow(2)).toEqual(
      currentFundsA + currentFundsB,
    );
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

  test('verifies balance calculation after fund transfer', async () => {
    await budgetPage.waitFor();

    const initialBalanceRow1 = await budgetPage.getBalanceForRow(1);
    const initialBalanceRow2 = await budgetPage.getBalanceForRow(2);
    console.log(`[fund-transfer] before — row1: $${(initialBalanceRow1 / 100).toFixed(2)}, row2: $${(initialBalanceRow2 / 100).toFixed(2)}`);

    await budgetPage.transferAllBalance(1, 2);
    await page.waitForTimeout(1000);

    const finalBalanceRow1 = await budgetPage.getBalanceForRow(1);
    const finalBalanceRow2 = await budgetPage.getBalanceForRow(2);
    const expectedBalance = initialBalanceRow1 + initialBalanceRow2;
    console.log(`[fund-transfer] after  — row1: $${(finalBalanceRow1 / 100).toFixed(2)}, row2: $${(finalBalanceRow2 / 100).toFixed(2)}, expected row2: $${(expectedBalance / 100).toFixed(2)}`);

    expect(Math.abs(finalBalanceRow1)).toBeLessThan(100); // Within $1.00
    expect(Math.abs(finalBalanceRow2 - expectedBalance)).toBeLessThan(100); // Within $1.00
  });

  test('verifies total budgeted updates when a category allocation changes', async () => {
    await budgetPage.waitFor();

    let rowBudgetedBefore: number;
    let totalsBefore: Awaited<ReturnType<typeof budgetPage.getTableTotals>>;
    let totalsAfter: Awaited<ReturnType<typeof budgetPage.getTableTotals>>;
    const newAmount = 300;

    await test.step('read current state: row budget and table total', async () => {
      const categoryRow = budgetPage.budgetTable.getByTestId('row').nth(1);
      const budgetCell = categoryRow.getByTestId('budget');
      const rowBudgetedText = await budgetCell.textContent();
      rowBudgetedBefore = Math.round(
        parseFloat((rowBudgetedText ?? '0').replace(/,/g, '')) * 100,
      );
      totalsBefore = await budgetPage.getTableTotals();
      console.log(`[allocation-update] before — row budget: $${(rowBudgetedBefore / 100).toFixed(2)}, table total budgeted: $${(totalsBefore.budgeted / 100).toFixed(2)}`);
    });

    await test.step(`set category budget to $${newAmount}`, async () => {
      const categoryRow = budgetPage.budgetTable.getByTestId('row').nth(1);
      const budgetCell = categoryRow.getByTestId('budget');
      await budgetCell.click();
      await budgetCell.getByRole('textbox').fill(String(newAmount));
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    });

    await test.step('assert table total changed by the exact delta, spent unchanged', async () => {
      totalsAfter = await budgetPage.getTableTotals();
      const expectedDelta = newAmount * 100 - rowBudgetedBefore!;
      const actualDelta = totalsAfter.budgeted - totalsBefore!.budgeted;
      console.log(`[allocation-update] after  — table total budgeted: $${(totalsAfter.budgeted / 100).toFixed(2)}, expected delta: $${(expectedDelta / 100).toFixed(2)}, actual delta: $${(actualDelta / 100).toFixed(2)}`);
      expect(actualDelta).toBe(expectedDelta);
      expect(totalsAfter.spent).toBe(totalsBefore!.spent);
    });
  });

  test('verifies budget allocation persists after page reload', async () => {
    await budgetPage.waitFor();

    const categoryRow = budgetPage.budgetTable.getByTestId('row').nth(1);
    const budgetCell = categoryRow.getByTestId('budget');

    await budgetCell.click();
    await budgetCell.getByRole('textbox').fill('450');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    const beforeReload = await budgetPage.getBalanceForRow(1);
    console.log(`[persist-reload] balance before reload: $${(beforeReload / 100).toFixed(2)}`);

    await page.reload({ waitUntil: 'networkidle' });
    await budgetPage.waitFor();

    const afterReload = await budgetPage.getBalanceForRow(1);
    console.log(`[persist-reload] balance after  reload: $${(afterReload / 100).toFixed(2)} — match: ${afterReload === beforeReload}`);
    expect(afterReload).toBe(beforeReload);
  });

  test('verifies escape key cancels budget edit without saving', async () => {
    await budgetPage.waitFor();

    const initialBalance = await budgetPage.getBalanceForRow(1);
    console.log(`[escape-cancel] balance before edit: $${(initialBalance / 100).toFixed(2)}`);

    const categoryRow = budgetPage.budgetTable.getByTestId('row').nth(1);
    const budgetCell = categoryRow.getByTestId('budget');

    await budgetCell.click();
    await budgetCell.getByRole('textbox').fill('999999');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const finalBalance = await budgetPage.getBalanceForRow(1);
    console.log(`[escape-cancel] balance after  Escape: $${(finalBalance / 100).toFixed(2)} — unchanged: ${finalBalance === initialBalance}`);
    expect(finalBalance).toBe(initialBalance);
  });

  test('verifies zero-out allocation returns funds to budget', async () => {
    await budgetPage.waitFor();

    const categoryRow = budgetPage.budgetTable.getByTestId('row').nth(1);
    const budgetCell = categoryRow.getByTestId('budget');

    // Pin the category to $500, then zero it out and confirm the total
    // budgeted drops by exactly $500 (= 50000 cents).
    await budgetCell.click();
    await budgetCell.getByRole('textbox').fill('500');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const totalsAfter500 = await budgetPage.getTableTotals();
    console.log(`[zero-out] after $500 — table total budgeted: $${(totalsAfter500.budgeted / 100).toFixed(2)}`);

    await budgetCell.click();
    await budgetCell.getByRole('textbox').fill('0');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const totalsAfterZero = await budgetPage.getTableTotals();
    console.log(`[zero-out] after $0   — table total budgeted: $${(totalsAfterZero.budgeted / 100).toFixed(2)}, delta: $${((totalsAfter500.budgeted - totalsAfterZero.budgeted) / 100).toFixed(2)} (expected $500.00)`);
    expect(totalsAfterZero.budgeted).toBe(totalsAfter500.budgeted - 50000);
  });

  test('navigates between months and updates the budget summary', async () => {
    await budgetPage.waitFor();

    const summary = await budgetPage.getCurrentMonthSummary();

    // The summary header shows the current month name — capture it before navigating.
    const initialSummaryText = await summary.textContent();
    console.log(`[month-nav] current month summary: "${initialSummaryText?.slice(0, 60)}"`);

    await budgetPage.goToPreviousMonth();
    await page.waitForTimeout(300);

    const prevMonthSummaryText = await summary.textContent();
    console.log(`[month-nav] prev month summary:    "${prevMonthSummaryText?.slice(0, 60)}"`);
    expect(prevMonthSummaryText).not.toBe(initialSummaryText);

    await budgetPage.goToNextMonth();
    await budgetPage.goToNextMonth();
    await page.waitForTimeout(300);

    const nextMonthSummaryText = await summary.textContent();
    console.log(`[month-nav] next month summary:    "${nextMonthSummaryText?.slice(0, 60)}"`);
    expect(nextMonthSummaryText).not.toBe(prevMonthSummaryText);
  });

  test('creates a new budget category inside an existing group', async () => {
    await budgetPage.waitFor();

    let rowsBefore: number;

    await test.step('record current row count in budget table', async () => {
      rowsBefore = await budgetPage.budgetTable.getByTestId('row').count();
      console.log(`[new-category] row count before: ${rowsBefore}`);
    });

    await test.step('hover group ancestor to reveal hidden Add category button, then click', async () => {
      // The button uses CSS display:none (hover-visible pattern). Hovering the
      // 5th ancestor makes it display:flex; dispatchEvent fires the React Aria handler.
      const addCategoryBtn = page.locator('[aria-label="Add category"]').first();
      await addCategoryBtn.locator('xpath=ancestor::*[5]').hover();
      await addCategoryBtn.dispatchEvent('click');
    });

    await test.step('type new category name and confirm with Enter', async () => {
      const categoryInput =
        budgetPage.budgetTable.getByPlaceholder('New category name');
      await categoryInput.fill('Test Category');
      await page.keyboard.press('Enter');
    });

    await test.step('assert "Test Category" row appears and total count increased by 1', async () => {
      await expect(
        budgetPage.budgetTable
          .getByTestId('row')
          .filter({ hasText: 'Test Category' })
          .first(),
      ).toBeVisible();
      const rowsAfter = await budgetPage.budgetTable.getByTestId('row').count();
      console.log(`[new-category] row count after:  ${rowsAfter} (expected ${rowsBefore! + 1})`);
      expect(rowsAfter).toBe(rowsBefore! + 1);
    });
  });

  test('budget spending transaction reduces the category balance', async () => {
    let categoryName: string;
    let balanceAfterAllocation: number;
    let balanceAfterSpend: number;

    await test.step('allocate $300 to first category (Food) on budget page', async () => {
      await budgetPage.waitFor();
      const categoryRow = budgetPage.budgetTable.getByTestId('row').nth(1);
      categoryName = await budgetPage.getCategoryNameForRow(1);
      const budgetCell = categoryRow.getByTestId('budget');
      await budgetCell.click();
      await budgetCell.getByRole('textbox').fill('300');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      balanceAfterAllocation = await budgetPage.getBalanceForRow(1);
      console.log(`[cross-feature] category: "${categoryName!}", balance after $300 allocation: $${(balanceAfterAllocation / 100).toFixed(2)}`);
    });

    await test.step(`navigate to Ally Savings and create $100 transaction in "${categoryName!}"`, async () => {
      const accountPage = await navigation.goToAccountPage('Ally Savings');
      await accountPage.createSingleTransaction({
        payee: 'Kroger',
        category: categoryName!,
        debit: '100.00',
      });
    });

    await test.step('return to budget page and assert envelope balance decreased by $100', async () => {
      await navigation.goToBudgetPage();
      await budgetPage.waitFor();
      await page.mouse.move(0, 0);
      balanceAfterSpend = await budgetPage.getBalanceForRow(1);
      const drop = balanceAfterAllocation! - balanceAfterSpend;
      console.log(`[cross-feature] balance after $100 spend: $${(balanceAfterSpend / 100).toFixed(2)}, drop: $${(drop / 100).toFixed(2)} (expected $100.00)`);
      // $100 = 10 000 cents
      expect(drop).toBe(10000);
    });
  });
});

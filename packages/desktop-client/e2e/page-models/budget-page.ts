import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { AccountPage } from './account-page';

export class BudgetPage {
  readonly page: Page;
  readonly budgetSummary: Locator;
  readonly budgetTable: Locator;
  readonly budgetTableTotals: Locator;
  readonly selectedMonthButton: Locator;
  readonly nextMonthButton: Locator;
  readonly prevMonthButton: Locator;
  readonly budgetTableScrollContainer: Locator;

  constructor(page: Page) {
    this.page = page;

    this.budgetSummary = page.getByTestId('budget-summary');
    this.budgetTable = page.getByTestId('budget-table');
    this.budgetTableTotals = this.budgetTable.getByTestId('budget-totals');
    this.selectedMonthButton = page.getByTestId('selected-budget-month');
    this.nextMonthButton = page.getByTitle('Next month');
    this.prevMonthButton = page.getByTitle('Previous month');
    this.budgetTableScrollContainer = page.getByTestId(
      'budget-table-scroll-container',
    );
  }

  async getScrollTop() {
    return this.budgetTableScrollContainer.evaluate(el => el.scrollTop);
  }

  async scrollToBottom() {
    await this.budgetTableScrollContainer.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
  }

  /**
   * Wait for the budget page to finish loading. The budget-table is
   * inside AutoSizer which returns null until layout provides width/
   * height, so it only appears after the page has fully mounted.
   */
  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.budgetTable.waitFor(...options);
  }

  async getTotalBudgeted() {
    const totalBudgetedText = await this.budgetTableTotals
      .getByTestId(/total-budgeted$/)
      .textContent();

    if (!totalBudgetedText) {
      throw new Error('Failed to get total budgeted.');
    }

    // parseInt alone truncates at the first comma in values like
    // "3,030.00" (-> 3); match getBalanceForRow's parsing instead.
    return Math.round(parseFloat(totalBudgetedText.replace(/,/g, '')) * 100);
  }

  async getTotalSpent() {
    const totalSpentText = await this.budgetTableTotals
      .getByTestId(/total-spent$/)
      .textContent();

    if (!totalSpentText) {
      throw new Error('Failed to get total spent.');
    }

    return Math.round(parseFloat(totalSpentText.replace(/,/g, '')) * 100);
  }

  async getTotalLeftover() {
    const totalLeftoverText = await this.budgetTableTotals
      .getByTestId(/total-leftover$/)
      .textContent();

    if (!totalLeftoverText) {
      throw new Error('Failed to get total leftover.');
    }

    return Math.round(parseFloat(totalLeftoverText.replace(/,/g, '')) * 100);
  }

  async getTableTotals() {
    return {
      budgeted: await this.getTotalBudgeted(),
      spent: await this.getTotalSpent(),
      balance: await this.getTotalLeftover(),
    };
  }

  async setBudgetedAmount(
    categoryName: string,
    amount: string,
    monthIndex = 0,
  ) {
    const row = this.budgetTable
      .getByTestId('row')
      .filter({ hasText: categoryName })
      .first();
    const budgetCell = row.getByTestId('budget').nth(monthIndex);

    await budgetCell.click();
    const input = budgetCell.locator('input');
    await input.waitFor({ state: 'visible' });
    await input.fill(amount);
    await input.press('Enter');
  }

  async getSelectedMonth() {
    const selectedMonth =
      await this.selectedMonthButton.getAttribute('data-month');

    if (!selectedMonth) {
      throw new Error('Failed to get the selected month.');
    }

    return selectedMonth;
  }

  async #waitForNewMonthToLoad({
    currentMonth,
    errorMessage,
  }: {
    currentMonth: string;
    errorMessage: string;
  }) {
    await expect(this.selectedMonthButton, errorMessage).not.toHaveAttribute(
      'data-month',
      currentMonth,
    );

    return this.getSelectedMonth();
  }

  async goToNextMonth() {
    const currentMonth = await this.getSelectedMonth();

    await this.nextMonthButton.click();

    return await this.#waitForNewMonthToLoad({
      currentMonth,
      errorMessage: 'Failed to navigate to the next month.',
    });
  }

  async goToPrevMonth() {
    const currentMonth = await this.getSelectedMonth();

    await this.prevMonthButton.click();

    return await this.#waitForNewMonthToLoad({
      currentMonth,
      errorMessage: 'Failed to navigate to the previous month.',
    });
  }

  async getBalanceForRow(idx: number) {
    const balanceText = await this.budgetTable
      .getByTestId('row')
      .nth(idx)
      .getByTestId('balance')
      .textContent();

    if (!balanceText) {
      throw new Error(`Failed to get balance on row index ${idx}.`);
    }

    return Math.round(parseFloat(balanceText.replace(/,/g, '')) * 100);
  }

  async getCategoryNameForRow(idx: number) {
    const categoryNameText = this.budgetTable
      .getByTestId('row')
      .nth(idx)
      .getByTestId('category-name')
      .textContent();

    if (!categoryNameText) {
      throw new Error(`Failed to get category name on row index ${idx}.`);
    }

    return categoryNameText;
  }

  async clickOnSpentAmountForRow(idx: number) {
    await this.budgetTable
      .getByTestId('row')
      .nth(idx)
      .getByTestId('category-month-spent')
      .click();
    return new AccountPage(this.page);
  }

  async clickOnSpentAmountForLastVisibleRow() {
    // Click the last spent-amount cell currently visible in the scroll container
    // without triggering Playwright's auto-scroll-into-view, so the scroll
    // position is not changed before the click handler captures it.
    const clicked = await this.page.evaluate(() => {
      const container = document.querySelector(
        '[data-testid="budget-table-scroll-container"]',
      );
      if (!container) {
        throw new Error('Budget scroll container not found');
      }
      const containerRect = container.getBoundingClientRect();
      const cells = container.querySelectorAll<HTMLElement>(
        '[data-testid="category-month-spent"]',
      );
      for (const cell of [...cells].reverse()) {
        const rect = cell.getBoundingClientRect();
        if (
          rect.top >= containerRect.top &&
          rect.bottom <= containerRect.bottom
        ) {
          cell.click();
          return true;
        }
      }
      return false;
    });

    if (!clicked) {
      throw new Error('No visible spent-amount cell found to click');
    }
    return new AccountPage(this.page);
  }

  async transferAllBalance(fromIdx: number, toIdx: number) {
    const toName = await this.getCategoryNameForRow(toIdx);
    if (!toName) {
      throw new Error(`Unable to get category name of row index ${toIdx}.`);
    }

    await this.budgetTable
      .getByTestId('row')
      .nth(fromIdx)
      .getByTestId('balance')
      .getByTestId(/^budget/)
      .click();

    await this.page
      .getByRole('button', { name: 'Transfer to another category' })
      .click();

    await this.page.getByPlaceholder('(none)').click();

    await this.page.keyboard.type(toName);
    await this.page.keyboard.press('Enter');

    await this.page.getByRole('button', { name: 'Transfer' }).click();
  }

  getCategoryRowByName(categoryName: string) {
    return this.budgetTable
      .getByTestId('row')
      .filter({ hasText: categoryName })
      .first();
  }

  async getBudgetedForRow(idx: number) {
    const budgetedText = await this.budgetTable
      .getByTestId('row')
      .nth(idx)
      .getByTestId('budget')
      .first()
      .textContent();

    if (!budgetedText) {
      throw new Error(`Failed to get budgeted amount on row index ${idx}.`);
    }

    return Math.round(parseFloat(budgetedText.replace(/,/g, '')) * 100);
  }

  async getSpentForRow(idx: number) {
    const spentText = await this.budgetTable
      .getByTestId('row')
      .nth(idx)
      .getByTestId('category-month-spent')
      .textContent();

    if (!spentText) {
      throw new Error(`Failed to get spent amount on row index ${idx}.`);
    }

    return Math.round(parseFloat(spentText.replace(/,/g, '')) * 100);
  }

  /**
   * Cover an overspent category's negative balance from another category,
   * mirroring transferAllBalance's UI flow (same category-autocomplete
   * pattern) but via the "Cover overspending" menu item.
   */
  async coverOverspending(overspentIdx: number, fromCategoryName: string) {
    await this.budgetTable
      .getByTestId('row')
      .nth(overspentIdx)
      .getByTestId('balance')
      .getByTestId(/^budget/)
      .click();

    await this.page.getByRole('button', { name: 'Cover overspending' }).click();

    await this.page.getByPlaceholder('(none)').click();

    await this.page.keyboard.type(fromCategoryName);
    await this.page.keyboard.press('Enter');

    await this.page.getByRole('button', { name: 'Transfer' }).click();
  }

  async rightClickCategory(idx: number) {
    await this.budgetTable
      .getByTestId('row')
      .nth(idx)
      .getByTestId('category-name')
      .click({ button: 'right' });
  }

  /**
   * Delete a category via its context menu. When it has existing
   * transactions, ConfirmCategoryDeleteModal requires a transfer target
   * before the "Delete" button will submit -- there's no "leave
   * uncategorized" option.
   */
  async deleteCategoryWithTransfer(
    idx: number,
    transferToCategoryName: string,
  ) {
    await this.rightClickCategory(idx);
    await this.page
      .getByRole('menu')
      .getByRole('button', { name: 'Delete' })
      .click();

    const dialog = this.page.getByRole('dialog');
    await dialog.getByPlaceholder('Select category...').click();
    await this.page.keyboard.type(transferToCategoryName);
    await this.page.keyboard.press('Enter');
    await dialog.getByRole('button', { name: 'Delete' }).click();
  }

  async rightClickCategoryGroup(name: string) {
    // Assuming category groups have a specific text or role, or we can just find by text
    await this.budgetTable
      .getByText(name, { exact: true })
      .click({ button: 'right' });
  }
}

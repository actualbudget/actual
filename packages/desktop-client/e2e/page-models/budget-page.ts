import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { AccountPage } from './account-page';
import { clickReactAriaButton } from './navigation';

export class BudgetPage {
  readonly page: Page;
  readonly budgetSummary: Locator;
  readonly budgetTable: Locator;
  readonly budgetTableTotals: Locator;
  readonly selectedMonthButton: Locator;
  readonly nextMonthButton: Locator;
  readonly previousMonthButton: Locator;
  readonly budgetTableScrollContainer: Locator;

  constructor(page: Page) {
    this.page = page;

    this.budgetSummary = page.getByTestId('budget-summary');
    this.budgetTable = page.getByTestId('budget-table');
    this.budgetTableTotals = this.budgetTable.getByTestId('budget-totals');
    this.selectedMonthButton = page.getByTestId('selected-budget-month');
    this.nextMonthButton = page.getByTitle('Next month');
    this.previousMonthButton = page.getByTitle('Previous month');
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

    return parseInt(totalBudgetedText, 10);
  }

  async getTotalSpent() {
    const totalSpentText = await this.budgetTableTotals
      .getByTestId(/total-spent$/)
      .textContent();

    if (!totalSpentText) {
      throw new Error('Failed to get total spent.');
    }

    return parseInt(totalSpentText, 10);
  }

  async getTotalLeftover() {
    const totalLeftoverText = await this.budgetTableTotals
      .getByTestId(/total-leftover$/)
      .textContent();

    if (!totalLeftoverText) {
      throw new Error('Failed to get total leftover.');
    }

    return parseInt(totalLeftoverText, 10);
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

  async goToPreviousMonth() {
    const currentMonth = await this.getSelectedMonth();

    await this.previousMonthButton.click();

    return await this.#waitForNewMonthToLoad({
      currentMonth,
      errorMessage: 'Failed to navigate to the previous month.',
    });
  }

  /**
   * Resolve a budget-table row either by index or by category name. Prefer
   * a category name for any category created within the test itself (e.g.
   * via the `category-create` API) — fixture categories can carry
   * pre-existing budgeted/spent/carryover history from prior months, which
   * makes row-index-based absolute-value assertions unreliable.
   */
  #getRow(row: number | string) {
    return typeof row === 'number'
      ? this.budgetTable.getByTestId('row').nth(row)
      : this.budgetTable.getByTestId('row').filter({ hasText: row }).first();
  }

  async getBalanceForRow(row: number | string) {
    const balanceText = await this.#getRow(row)
      .getByTestId('balance')
      .textContent();

    if (!balanceText) {
      throw new Error(`Failed to get balance for row "${row}".`);
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

  /**
   * Open the balance-cell menu (Rollover overspending / Transfer / Cover
   * overspending) for a category row (by index or name) and return the
   * popover locator.
   */
  async openBalanceMenu(row: number | string) {
    await clickReactAriaButton(
      this.#getRow(row)
        .getByTestId('balance')
        .getByTestId(/^budget/),
    );

    const popover = this.page.locator('[data-popover]');
    await popover.waitFor({ state: 'visible' });
    return popover;
  }

  /**
   * Toggle "Rollover overspending" / "Remove overspending rollover" for a
   * category row. Present regardless of the category's balance sign.
   */
  async toggleCarryover(row: number | string) {
    const popover = await this.openBalanceMenu(row);
    await clickReactAriaButton(
      popover.getByRole('button', {
        name: /rollover overspending|overspending rollover/i,
      }),
    );
  }

  /**
   * Cover an overspent category's balance from another category. Only
   * available in the menu when the row's balance is negative.
   */
  async coverOverspending(
    row: number | string,
    fromCategoryName: string,
    amount?: string,
  ) {
    const popover = await this.openBalanceMenu(row);
    await popover.getByRole('button', { name: 'Cover overspending' }).click();

    if (amount) {
      const amountInput = popover.getByRole('textbox').first();
      await amountInput.fill(amount);
    }

    await popover.getByPlaceholder('(none)').click();
    await this.page.keyboard.type(fromCategoryName);
    await this.page.keyboard.press('Enter');
    await popover.getByRole('button', { name: 'Transfer' }).click();
  }

  /**
   * The spreadsheet's sheet name for a given month is not the raw
   * "YYYY-MM" string — it's `sheetForMonth` from loot-core
   * (`'budget' + month.replace('-', '')`), which is what feeds `data-testid`
   * on per-month cell values. Replicated here since the page model has no
   * access to `monthUtils`.
   */
  async #getMonthSheetName() {
    const month = await this.getSelectedMonth();
    return `budget${month.replace('-', '')}`;
  }

  /**
   * Locate the "To Budget" / "Overbudgeted" amount for the currently
   * selected month. The budget view keeps adjacent months mounted in the
   * DOM, so this must be scoped by month rather than a bare testid.
   */
  async #getToBudgetAmountLocator() {
    const sheetName = await this.#getMonthSheetName();
    return this.page.getByTestId(`${sheetName}!to-budget`);
  }

  /**
   * Open the "To Budget" / "Overbudgeted" summary menu and return the
   * popover locator.
   */
  async openToBudgetMenu() {
    await clickReactAriaButton(await this.#getToBudgetAmountLocator());

    const popover = this.page.locator('[data-popover]');
    await popover.waitFor({ state: 'visible' });
    return popover;
  }

  /**
   * Hold an amount of the current "To Budget" total for next month. Only
   * available when "To Budget" is positive and no auto-buffer is active.
   * Defaults to holding the full pre-filled amount.
   */
  async holdForNextMonth(amount?: string) {
    const popover = await this.openToBudgetMenu();
    // Plain `.click()` — see the comment in `coverOverspending` above;
    // this button switches the popover's internal step (ToBudgetMenu ->
    // HoldMenu) and is subject to the same native-click/refocus race.
    await popover.getByRole('button', { name: 'Hold for next month' }).click();

    if (amount) {
      const amountInput = popover.getByRole('textbox').first();
      await amountInput.fill(amount);
    }

    await popover.getByRole('button', { name: 'Hold' }).click();
  }

  /**
   * Reset a previously-held "for next month" buffer back to zero.
   */
  async resetHoldBuffer() {
    const popover = await this.openToBudgetMenu();
    await popover
      .getByRole('button', { name: "Reset next month's buffer" })
      .click();
  }

  async getToBudgetAmount() {
    const text = await (await this.#getToBudgetAmountLocator()).textContent();

    if (!text) {
      throw new Error('Failed to get the "To Budget" amount.');
    }

    return Math.round(parseFloat(text.replace(/,/g, '')) * 100);
  }

  async getForNextMonthAmount() {
    const sheetName = await this.#getMonthSheetName();
    const text = await this.page
      .getByTestId(`${sheetName}!buffered-selected`)
      .textContent();

    if (!text) {
      throw new Error('Failed to get the "For next month" amount.');
    }

    return Math.round(parseFloat(text.replace(/,/g, '')) * 100);
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
}

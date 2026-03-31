import type { Locator, Page } from '@playwright/test';

import { AccountPage } from './account-page';

export class BudgetPage {
  readonly page: Page;
  readonly budgetSummary: Locator;
  readonly budgetTable: Locator;
  readonly budgetTableTotals: Locator;

  constructor(page: Page) {
    this.page = page;

    this.budgetSummary = page.getByTestId('budget-summary');
    this.budgetTable = page.getByTestId('budget-table');
    this.budgetTableTotals = this.budgetTable.getByTestId('budget-totals');
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

  async showMoreMonths() {
    await this.page.getByTestId('calendar-icon').first().click();
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

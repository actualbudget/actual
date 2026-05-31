import { currencyToInteger } from '@actual-app/core/shared/util';
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

  /**
   * Wait for the budget page to finish loading. The budget-table is
   * inside AutoSizer which returns null until layout provides width/
   * height, so it only appears after the page has fully mounted.
   */
  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.budgetTable.waitFor(...options);
  }

  private parseCurrencyText(text: string): number {
    const amount = currencyToInteger(text);
    if (amount == null) throw new Error(`Failed to parse currency: "${text}"`);
    return amount;
  }

  async getTotalBudgeted() {
    const text = await this.budgetTableTotals
      .getByTestId(/total-budgeted$/)
      .textContent();

    if (!text) throw new Error('Failed to get total budgeted.');
    return this.parseCurrencyText(text);
  }

  async getTotalSpent() {
    const text = await this.budgetTableTotals
      .getByTestId(/total-spent$/)
      .textContent();

    if (!text) throw new Error('Failed to get total spent.');
    return this.parseCurrencyText(text);
  }

  async getTotalLeftover() {
    const text = await this.budgetTableTotals
      .getByTestId(/total-leftover$/)
      .textContent();

    if (!text) throw new Error('Failed to get total leftover.');
    return this.parseCurrencyText(text);
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

  async goToPreviousMonth() {
    await this.page.getByTitle('Previous month').click();
  }

  async goToNextMonth() {
    await this.page.getByTitle('Next month').click();
  }

  async getCurrentMonthSummary() {
    return this.budgetSummary.first();
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
    const categoryNameText = await this.budgetTable
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

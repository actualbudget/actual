import { type Locator, type Page } from '@playwright/test';

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

  async getTableTotals() {
    return {
      budgeted: parseInt(
        await this.budgetTableTotals
          .getByTestId(/total-budgeted$/)
          .textContent(),
        10,
      ),
      spent: parseInt(
        await this.budgetTableTotals.getByTestId(/total-spent$/).textContent(),
        10,
      ),
      balance: parseInt(
        await this.budgetTableTotals
          .getByTestId(/total-leftover$/)
          .textContent(),
        10,
      ),
    };
  }

  async showMoreMonths() {
    await this.page.getByTestId('calendar-icon').first().click();
  }

  async getBalanceForRow(idx: number) {
    return Math.round(
      parseFloat(
        (
          await this.budgetTable
            .getByTestId('row')
            .nth(idx)
            .getByTestId('balance')
            .textContent()
        ).replace(/,/g, ''),
      ) * 100,
    );
  }

  async getCategoryNameForRow(idx: number) {
    return this.budgetTable
      .getByTestId('row')
      .nth(idx)
      .getByTestId('category-name')
      .textContent();
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

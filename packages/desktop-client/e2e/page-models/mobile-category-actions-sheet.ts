import type { Locator, Page } from '@playwright/test';

import { BudgetAmountSheet } from './mobile-budget-amount-sheet';

export class CategoryActionsSheet {
  readonly page: Page;
  readonly locator: Locator;
  readonly editBudgetedAmountRow: Locator;
  readonly copyLastMonthBudgetRow: Locator;
  readonly setTo3MonthAverageRow: Locator;
  readonly setTo6MonthAverageRow: Locator;
  readonly setToYearlyAverageRow: Locator;
  readonly applyBudgetTemplateRow: Locator;
  readonly editAutomationsRow: Locator;
  readonly renameRow: Locator;
  readonly noteRow: Locator;
  readonly deleteCategoryRow: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.editBudgetedAmountRow = locator.getByRole('button', {
      name: /^Edit budgeted amount/,
    });
    this.copyLastMonthBudgetRow = locator.getByRole('button', {
      name: /^Copy last month.s budget$/,
    });
    this.setTo3MonthAverageRow = locator.getByRole('button', {
      name: 'Set to 3 month average',
    });
    this.setTo6MonthAverageRow = locator.getByRole('button', {
      name: 'Set to 6 month average',
    });
    this.setToYearlyAverageRow = locator.getByRole('button', {
      name: 'Set to yearly average',
    });
    this.applyBudgetTemplateRow = locator.getByRole('button', {
      name: 'Overwrite with template',
    });
    this.editAutomationsRow = locator.getByRole('button', {
      name: 'Budget automations',
    });
    this.renameRow = locator.getByRole('button', { name: 'Rename' });
    this.noteRow = locator.getByRole('button', { name: 'Edit notes' });
    this.deleteCategoryRow = locator.getByRole('button', {
      name: 'Delete',
      exact: true,
    });
  }

  async close() {
    await this.locator.press('Escape');
  }

  async openBudgetAmount() {
    await this.editBudgetedAmountRow.click();

    return new BudgetAmountSheet(this.page.getByRole('dialog'));
  }

  async copyLastMonthBudget() {
    await this.copyLastMonthBudgetRow.click();
  }

  async setTo3MonthAverage() {
    await this.setTo3MonthAverageRow.click();
  }

  async setTo6MonthAverage() {
    await this.setTo6MonthAverageRow.click();
  }

  async setToYearlyAverage() {
    await this.setToYearlyAverageRow.click();
  }

  async applyBudgetTemplate() {
    await this.applyBudgetTemplateRow.click();
  }

  async editAutomations() {
    await this.editAutomationsRow.click();

    return this.page.getByRole('dialog', { name: 'Modal dialog' });
  }

  async delete() {
    await this.deleteCategoryRow.click();
  }
}

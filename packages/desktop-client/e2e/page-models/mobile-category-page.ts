import * as monthUtils from '@actual-app/core/shared/months';
import type { Locator, Page } from '@playwright/test';

import { BudgetAmountSheet } from './mobile-budget-amount-sheet';
import { CategoryActionsSheet } from './mobile-category-actions-sheet';

export class MobileCategoryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly backButton: Locator;
  readonly menuButton: Locator;
  readonly balance: Locator;
  readonly budgetedButton: Locator;
  readonly transactionList: Locator;
  readonly spendingHistoryHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { level: 1 });
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.menuButton = page.getByRole('button', {
      name: 'Category menu',
    });
    this.balance = page.getByTestId('category-balance');
    this.budgetedButton = page.getByRole('button', {
      name: /^Edit budgeted amount for/,
    });
    this.transactionList = page.getByLabel('Transaction list');
    this.spendingHistoryHeading = page.getByText(
      /^(Spending|Income) · last \d+ months$/,
    );
  }

  getSpendingHistoryBar(month: string) {
    const escaped = monthUtils
      .format(month, 'MMMM yyyy')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('button', { name: new RegExp(`^${escaped}: `) });
  }

  getSpendingHistoryDetail(month: string, amount: string) {
    return this.page.getByText(
      `${monthUtils.format(month, "MMMM ''yy")} · ${amount}`,
    );
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.balance.waitFor(...options);
  }

  async goBack() {
    await this.backButton.click();
  }

  async openActions() {
    await this.menuButton.click();

    return new CategoryActionsSheet(this.page.getByRole('dialog'));
  }

  async openBudgetAmount() {
    await this.budgetedButton.click();

    return new BudgetAmountSheet(this.page.getByRole('dialog'));
  }
}

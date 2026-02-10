import type { Locator, Page } from '@playwright/test';

export class BalanceMenuModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly balanceAmountInput: Locator;
  readonly transferToAnotherCategoryButton: Locator;
  readonly coverOverspendingButton: Locator;
  readonly rolloverOverspendingButton: Locator;
  readonly removeOverspendingRolloverButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.balanceAmountInput = locator.getByTestId('amount-input');
    this.transferToAnotherCategoryButton = locator.getByRole('button', {
      name: 'Transfer to another category',
    });
    this.coverOverspendingButton = locator.getByRole('button', {
      name: 'Cover overspending',
    });
    this.rolloverOverspendingButton = locator.getByRole('button', {
      name: 'Rollover overspending',
    });
    this.removeOverspendingRolloverButton = locator.getByRole('button', {
      name: 'Remove overspending rollover',
    });
  }

  async close() {
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }
}

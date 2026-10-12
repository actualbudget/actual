import type { Locator, Page } from '@playwright/test';

export class BudgetAmountSheet {
  readonly page: Page;
  readonly locator: Locator;
  readonly amountInput: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.amountInput = locator.getByTestId('amount-input');
  }

  async close() {
    await this.locator.press('Escape');
  }

  async setBudgetAmount(newAmount: string) {
    if (!(await this.amountInput.isVisible())) {
      await this.locator
        .getByRole('button', { name: /^-?[\d,]+\.\d{2}$/ })
        .click();
    }
    await this.amountInput.fill(newAmount);
    await this.amountInput.blur();
    await this.close();
  }
}

import { expect, type Locator, type Page } from '@playwright/test';

export class BalanceMenuModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly balanceAmountInput: Locator;
  readonly moneyKeypadModal: Locator;
  readonly transferToAnotherCategoryButton: Locator;
  readonly coverOverspendingButton: Locator;
  readonly rolloverOverspendingButton: Locator;
  readonly removeOverspendingRolloverButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.balanceAmountInput = locator.getByTestId('amount-input');
    this.moneyKeypadModal = this.page.getByTestId('money-keypad-modal');
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

  private async dismissKeypadIfOpen() {
    if (await this.moneyKeypadModal.isVisible()) {
      await this.moneyKeypadModal
        .getByRole('button', { name: 'Close' })
        .click();
      await expect(this.moneyKeypadModal).toHaveCount(0);
    }
  }

  async close() {
    await this.dismissKeypadIfOpen();
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }
}

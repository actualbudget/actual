export class BalanceMenuModal {
  constructor(page, locator) {
    this.page = page;
    this.locator = locator;

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

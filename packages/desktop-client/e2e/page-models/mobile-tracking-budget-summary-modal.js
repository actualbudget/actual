export class TrackingBudgetSummaryModal {
  constructor(page, locator) {
    this.page = page;
    this.locator = locator;

    this.heading = locator.getByRole('heading');
  }

  async close() {
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }
}

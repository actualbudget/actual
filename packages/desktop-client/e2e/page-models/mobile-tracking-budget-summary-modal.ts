import { type Locator, type Page } from '@playwright/test';

export class TrackingBudgetSummaryModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
  }

  async close() {
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }
}

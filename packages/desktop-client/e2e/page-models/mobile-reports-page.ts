import { type Locator, type Page } from '@playwright/test';

export class MobileReportsPage {
  readonly page: Page;
  readonly overview: Locator;

  constructor(page: Page) {
    this.page = page;

    this.overview = page.getByTestId('reports-overview');
  }

  async waitFor(options) {
    await this.overview.waitFor(options);
  }
}

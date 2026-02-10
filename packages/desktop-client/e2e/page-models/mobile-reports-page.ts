import type { Locator, Page } from '@playwright/test';

export class MobileReportsPage {
  readonly page: Page;
  readonly overview: Locator;

  constructor(page: Page) {
    this.page = page;

    this.overview = page.getByTestId('reports-overview');
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.overview.waitFor(...options);
  }
}

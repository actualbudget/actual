import { type Locator, type Page } from '@playwright/test';

export class PayeesPage {
  readonly page: Page;
  readonly searchBox: Locator;

  constructor(page: Page) {
    this.page = page;

    this.searchBox = page.getByPlaceholder('Filter payees...');
  }

  async searchFor(payeeName: string) {
    await this.searchBox.fill(payeeName);
  }
}

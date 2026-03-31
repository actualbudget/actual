import type { Page } from '@playwright/test';

export class BankSyncPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitToLoad() {
    await this.page.waitForSelector('text=Bank Sync', { timeout: 10000 });
  }
}

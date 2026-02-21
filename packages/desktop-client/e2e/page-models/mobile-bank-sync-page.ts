import type { Locator, Page } from '@playwright/test';

export class MobileBankSyncPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly accountsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder(/Filter accounts/i);
    this.accountsList = page.getByRole('main');
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.accountsList.waitFor(options);
  }

  async waitToLoad() {
    await this.page.waitForSelector('text=Bank Sync', { timeout: 10000 });
  }

  async searchFor(term: string) {
    await this.searchBox.fill(term);
  }
}

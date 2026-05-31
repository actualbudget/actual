import type { Locator, Page } from '@playwright/test';

export class PayeesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.searchBox = page.getByPlaceholder('Filter payees...');
    this.emptyMessage = page.getByText('No payees', { exact: true });
  }

  async searchFor(payeeName: string) {
    await this.searchBox.fill(payeeName);
  }

  async clearSearch() {
    await this.searchBox.fill('');
  }

  getAllRows() {
    return this.page.getByTestId('row');
  }

  getPayeeRow(payeeName: string) {
    return this.getAllRows().filter({ hasText: payeeName }).first();
  }

  getCreateRuleButton(payeeName: string) {
    return this.getPayeeRow(payeeName)
      .getByTestId('rule-count')
      .getByTestId('cell-button');
  }

  async getVisiblePayeeCount() {
    return await this.getAllRows().count();
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.page.waitForURL('**/payees', { timeout: options?.timeout });
    await this.searchBox.waitFor({
      state: options?.state === 'hidden' ? 'hidden' : 'visible',
      timeout: options?.timeout,
    });
  }
}

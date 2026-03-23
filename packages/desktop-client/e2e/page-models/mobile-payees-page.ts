import type { Locator, Page } from '@playwright/test';

const NO_PAYEES_FOUND_TEXT = 'No payees found.';

export class MobilePayeesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly payeesList: Locator;
  readonly noPayeesFoundText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter payees…');
    this.payeesList = page.getByRole('grid', { name: 'Payees' });
    this.noPayeesFoundText = this.payeesList.getByText(NO_PAYEES_FOUND_TEXT);
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.payeesList.waitFor(options);
  }

  /**
   * Search for payees using the search box
   */
  async searchFor(text: string) {
    await this.searchBox.fill(text);
  }

  /**
   * Clear the search box
   */
  async clearSearch() {
    await this.searchBox.fill('');
  }

  /**
   * Get the nth payee item (0-based index)
   */
  getNthPayee(index: number) {
    return this.getAllPayees().nth(index);
  }

  /**
   * Get all visible payee items
   */
  getAllPayees() {
    // `GridList.renderEmptyState` still renders a row with "No payees found" text
    // when no payees are present, so we need to filter that out to get the actual payee items.
    return this.payeesList
      .getByRole('row')
      .filter({ hasNotText: NO_PAYEES_FOUND_TEXT });
  }

  /**
   * Click on a payee to open the edit page
   */
  async clickPayee(index: number) {
    const payee = this.getNthPayee(index);
    await payee.click();
  }

  /**
   * Get the number of visible payees
   */
  async getPayeeCount() {
    const payees = this.getAllPayees();
    return await payees.count();
  }
}

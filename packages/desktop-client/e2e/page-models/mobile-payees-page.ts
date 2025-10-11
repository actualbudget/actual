import { type Locator, type Page } from '@playwright/test';

export class MobilePayeesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly payeesList: Locator;
  readonly emptyMessage: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter payees…');
    this.payeesList = page.getByRole('grid', { name: 'Payees' });
    this.emptyMessage = page.getByText('No payees found.');
    // eslint-disable-next-line actual/typography
    this.loadingIndicator = page.locator('[data-testid="animated-loading"]');
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
    return this.payeesList.getByRole('gridcell');
  }

  /**
   * Click on a payee to view/edit rules
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

  /**
   * Wait for loading to complete
   */
  async waitForLoadingToComplete(timeout: number = 10000) {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout });
  }
}

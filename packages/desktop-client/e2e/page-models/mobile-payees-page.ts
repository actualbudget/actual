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
   * Check if a payee contains specific text
   */
  async payeeContainsText(index: number, text: string) {
    const payee = this.getNthPayee(index);
    const payeeText = await payee.textContent();
    return payeeText?.includes(text) || false;
  }

  /**
   * Get the rule count badge text for a payee
   */
  async getPayeeRuleCount(index: number) {
    const payee = this.getNthPayee(index);
    // eslint-disable-next-line actual/typography
    const ruleCountBadge = payee.locator('[data-testid="payee-rule-count"]');
    if ((await ruleCountBadge.count()) > 0) {
      return await ruleCountBadge.textContent();
    }
    return null;
  }

  /**
   * Check if a payee has a favorite bookmark
   */
  async hasPayeeBookmark(index: number) {
    const payee = this.getNthPayee(index);
    // eslint-disable-next-line actual/typography
    const bookmark = payee.locator('[data-testid="bookmark-icon"]');
    return (await bookmark.count()) > 0;
  }

  /**
   * Check if a payee is a transfer account
   */
  async isTransferPayee(index: number) {
    const payee = this.getNthPayee(index);
    const payeeText = await payee.textContent();
    return payeeText?.includes('Transfer:') || false;
  }

  /**
   * Get the delete button for a payee (if available)
   */
  getPayeeDeleteButton(index: number) {
    const payee = this.getNthPayee(index);
    return payee.getByRole('button', { name: 'Delete' });
  }

  /**
   * Delete a payee by clicking the delete button
   */
  async deletePayee(index: number) {
    const deleteButton = this.getPayeeDeleteButton(index);
    await deleteButton.click();
  }

  /**
   * Check if the search bar has a border
   */
  async hasSearchBarBorder() {
    const searchContainer = this.searchBox.locator('..');
    const borderStyle = await searchContainer.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.borderBottomWidth;
    });
    return borderStyle === '2px';
  }

  /**
   * Get the background color of the search box
   */
  async getSearchBackgroundColor() {
    return await this.searchBox.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.backgroundColor;
    });
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingToComplete() {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Check if the page is in loading state
   */
  async isLoading() {
    return await this.loadingIndicator.isVisible();
  }
}

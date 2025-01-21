import { type Locator, type Page } from '@playwright/test';

import { MobileTransactionEntryPage } from './mobile-transaction-entry-page';

export class MobileAccountPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly balance: Locator;
  readonly noTransactionsMessage: Locator;
  readonly searchBox: Locator;
  readonly transactionList: Locator;
  readonly transactions: Locator;
  readonly createTransactionButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading');
    this.balance = page.getByTestId('transactions-balance');
    this.noTransactionsMessage = page.getByText('No transactions');
    this.searchBox = page.getByPlaceholder(/^Search/);
    this.transactionList = page.getByLabel('Transaction list');
    this.transactions = this.transactionList.getByRole('button');
    this.createTransactionButton = page.getByRole('button', {
      name: 'Add Transaction',
    });
  }

  async waitFor() {
    await this.transactionList.waitFor();
  }

  /**
   * Retrieve the balance of the account as a number
   */
  async getBalance() {
    return parseInt(await this.balance.textContent(), 10);
  }

  /**
   * Search by the given term
   */
  async searchByText(term: string) {
    await this.searchBox.fill(term);
  }

  async clearSearch() {
    await this.searchBox.clear();
  }

  /**
   * Go to transaction creation page
   */
  async clickCreateTransaction() {
    this.createTransactionButton.click();
    return new MobileTransactionEntryPage(this.page);
  }
}

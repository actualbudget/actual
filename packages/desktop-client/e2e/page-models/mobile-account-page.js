import { MobileTransactionEntryPage } from './mobile-transaction-entry-page';

export class MobileAccountPage {
  constructor(page) {
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

  /**
   * Retrieve the balance of the account as a number
   */
  async getBalance() {
    return parseInt(await this.balance.textContent(), 10);
  }

  /**
   * Search by the given term
   */
  async searchByText(term) {
    await this.searchBox.fill(term);
  }

  /**
   * Go to transaction creation page
   */
  async clickCreateTransaction() {
    this.createTransactionButton.click();
    return new MobileTransactionEntryPage(this.page);
  }
}

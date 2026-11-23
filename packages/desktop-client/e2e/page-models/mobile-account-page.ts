import type { Locator, Page } from '@playwright/test';

import { MobileTransactionEntryPage } from './mobile-transaction-entry-page';

export class MobileAccountPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly balance: Locator;
  readonly noTransactionsMessage: Locator;
  readonly searchBox: Locator;
  readonly transactionList: Locator;
  readonly transactions: Locator;
  readonly selectedCount: Locator;
  readonly loadingMore: Locator;
  readonly createTransactionButton: Locator;
  readonly accountMenuButton: Locator;
  readonly reconcilingBanner: Locator;
  readonly reconcilingBannerAllReconciled: Locator;
  readonly reconcilingBannerDifference: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading');
    this.balance = page.getByTestId('transactions-balance');
    this.noTransactionsMessage = page.getByText('No transactions');
    this.searchBox = page.getByPlaceholder(/^Search/);
    this.transactionList = page.getByLabel('Transaction list');
    this.transactions = this.transactionList.getByRole('button');
    this.selectedCount = page.getByText(/^\d+ transactions? selected$/);
    this.loadingMore = page.getByLabel('Loading more transactions...');
    this.createTransactionButton = page.getByRole('button', {
      name: 'Add Transaction',
    });
    this.accountMenuButton = this.heading.getByRole('button');
    this.reconcilingBanner = page.getByTestId('reconciling-banner');
    this.reconcilingBannerAllReconciled =
      this.reconcilingBanner.getByText('All reconciled!');
    this.reconcilingBannerDifference =
      this.reconcilingBanner.getByText('needs');
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.transactionList.waitFor(...options);
  }

  /**
   * Retrieve the balance of the account as a number
   */
  async getBalance() {
    const balanceText = await this.balance.textContent();
    if (!balanceText) {
      throw new Error('Failed to get balance.');
    }
    return parseInt(balanceText, 10);
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
   * Long press a transaction to start selecting transactions
   */
  async longPressTransaction(transaction: Locator) {
    // Hold until the selection shows instead of for a fixed time, so a slow
    // run can't release it before the long press registers. A list that is
    // still settling can cancel the press, so release and press again.
    for (let attempt = 0; attempt < 5; attempt++) {
      await transaction.hover();
      await this.page.mouse.down();
      const selected = await this.selectedCount.waitFor({ timeout: 2000 }).then(
        () => true,
        () => false,
      );
      if (!selected) {
        // Release away from the row, so a press that is still live can't
        // count as a tap and open the transaction.
        await this.page.mouse.move(0, 0);
      }
      await this.page.mouse.up();
      // A selection that lands just after the wait must not be pressed again.
      if (selected || (await this.selectedCount.isVisible())) {
        return;
      }
    }
    throw new Error('The long press never selected the transaction.');
  }

  /**
   * Scroll the transaction list to its end
   */
  async scrollToEndOfList() {
    // More transactions load as the list nears its end, so keep scrolling
    // until a finished load no longer makes it grow.
    let previousHeight = -1;
    for (let attempt = 0; attempt < 20; attempt++) {
      await this.transactionList.evaluate(el => {
        el.scrollTop = el.scrollHeight;
      });
      // Give the scroll a moment to start a load, then let it finish.
      await this.page.waitForTimeout(500);
      await this.loadingMore.waitFor({ state: 'hidden' });
      const height = await this.transactionList.evaluate(el => el.scrollHeight);
      if (height === previousHeight) {
        return;
      }
      previousHeight = height;
    }
    throw new Error('The transaction list kept growing.');
  }

  /**
   * Go to transaction creation page
   */
  async clickCreateTransaction() {
    await this.createTransactionButton.click();
    return new MobileTransactionEntryPage(this.page);
  }

  /**
   * Start reconciling the account
   */
  async startReconciliation(amount?: string) {
    await this.accountMenuButton.click();
    await this.page
      .getByTestId('account-menu-modal')
      .getByRole('button', { name: 'Reconcile', exact: true })
      .click();
    const reconcileModal = this.page.getByTestId('account-reconcile-modal');
    const amountInput = reconcileModal.getByTestId('amount-input');
    await amountInput.waitFor();
    if (amount != null) {
      await amountInput.fill(amount);
    }
    await reconcileModal.getByRole('button', { name: 'Reconcile' }).click();
    await this.reconcilingBanner.waitFor();
  }

  /**
   * Create a reconciliation balance adjustment transaction
   */
  async createReconciliationTransaction() {
    await this.page
      .getByRole('button', { name: 'Create reconciliation transaction' })
      .click();
  }

  /**
   * Lock all cleared transactions as reconciled
   */
  async lockTransactions() {
    await this.page.getByRole('button', { name: 'Lock transactions' }).click();
  }

  /**
   * Unclear the first cleared transaction in the list
   */
  async unclearFirstTransaction() {
    await this.page
      .getByRole('button', { name: 'Unclear transaction' })
      .first()
      .click();
  }

  /**
   * Clear the first uncleared transaction in the list
   */
  async clearFirstTransaction() {
    await this.page
      .getByRole('button', { name: 'Clear transaction' })
      .first()
      .click();
  }
}

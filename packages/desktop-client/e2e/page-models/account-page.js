export class AccountPage {
  constructor(page) {
    this.page = page;

    this.addNewTransactionButton = this.page.getByRole('button', {
      name: 'Add New'
    });
    this.newTransactionRow = this.page
      .getByTestId('new-transaction')
      .getByTestId('row');
    this.addTransactionButton = this.page.getByTestId('add-button');
    this.cancelTransactionButton = this.page.getByRole('button', {
      name: 'Cancel'
    });

    this.transactionTableRow = this.page
      .getByTestId('table')
      .getByTestId('row');
  }

  /**
   * Create a single transaction
   */
  async createSingleTransaction(transaction) {
    await this.addNewTransactionButton.click();

    await this._fillTransactionFields(this.newTransactionRow, transaction);

    await this.addTransactionButton.click();
    await this.cancelTransactionButton.click();
  }

  /**
   * Create split transactions
   */
  async createSplitTransaction([rootTransaction, ...transactions]) {
    await this.addNewTransactionButton.click();

    // Root transaction
    const transactionRow = this.newTransactionRow.first();
    await this._fillTransactionFields(transactionRow, {
      ...rootTransaction,
      category: 'split'
    });

    // Child transactions
    for (let i = 0; i < transactions.length; i++) {
      await this._fillTransactionFields(
        this.newTransactionRow.nth(i + 1),
        transactions[i]
      );

      if (i + 1 < transactions.length) {
        await this.page.getByRole('button', { name: 'Add Split' }).click();
      }
    }

    await this.addTransactionButton.click();
    await this.cancelTransactionButton.click();
  }

  /**
   * Retrieve the data for the nth-transaction.
   * 0-based index
   */
  async getNthTransaction(index) {
    const row = this.transactionTableRow.nth(index);

    return {
      payee: await row.getByTestId('payee').textContent(),
      notes: await row.getByTestId('notes').textContent(),
      category: await row.getByTestId('category').textContent(),
      debit: await row.getByTestId('debit').textContent(),
      credit: await row.getByTestId('credit').textContent()
    };
  }

  async _fillTransactionFields(transactionRow, transaction) {
    if (transaction.payee) {
      await transactionRow.getByTestId('payee').click();
      await this.page.keyboard.type(transaction.payee);
      await this.page.keyboard.press('Tab');
    }

    if (transaction.notes) {
      await transactionRow.getByTestId('notes').click();
      await this.page.keyboard.type(transaction.notes);
      await this.page.keyboard.press('Tab');
    }

    if (transaction.category) {
      await transactionRow.getByTestId('category').click();

      if (transaction.category === 'split') {
        await this.page.getByTestId('split-transaction-button').click();
      } else {
        await this.page.keyboard.type(transaction.category);
        await this.page.keyboard.press('Tab');
      }
    }

    if (transaction.debit) {
      await transactionRow.getByTestId('debit').click();
      await this.page.keyboard.type(transaction.debit);
      await this.page.keyboard.press('Tab');
    }

    if (transaction.credit) {
      await transactionRow.getByTestId('credit').click();
      await this.page.keyboard.type(transaction.credit);
      await this.page.keyboard.press('Tab');
    }
  }
}

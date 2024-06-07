import { CloseAccountModal } from './close-account-modal';

export class AccountPage {
  constructor(page) {
    this.page = page;

    this.accountName = this.page.getByTestId('account-name');
    this.accountBalance = this.page.getByTestId('account-balance');
    this.addNewTransactionButton = this.page.getByRole('button', {
      name: 'Add New',
    });
    this.newTransactionRow = this.page
      .getByTestId('new-transaction')
      .getByTestId('row');
    this.addTransactionButton = this.page.getByTestId('add-button');
    this.cancelTransactionButton = this.page.getByRole('button', {
      name: 'Cancel',
    });
    this.menuButton = this.page.getByRole('button', {
      name: 'Menu',
    });

    this.transactionTable = this.page.getByTestId('transaction-table');
    this.transactionTableRow = this.transactionTable.getByTestId('row');

    this.filterButton = this.page.getByRole('button', { name: 'Filter' });
    this.filterSelectTooltip = this.page.getByTestId('filters-select-tooltip');

    this.selectButton = this.page.getByTestId('transactions-select-button');
    this.selectTooltip = this.page.getByTestId('transactions-select-tooltip');
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
      category: 'split',
    });

    // Child transactions
    for (let i = 0; i < transactions.length; i++) {
      await this._fillTransactionFields(
        this.newTransactionRow.nth(i + 1),
        transactions[i],
      );

      if (i + 1 < transactions.length) {
        await this.page.getByRole('button', { name: 'Add Split' }).click();
      }
    }

    await this.addTransactionButton.click();
    await this.cancelTransactionButton.click();
  }

  async selectNthTransaction(index) {
    const row = this.transactionTableRow.nth(index);
    await row.getByTestId('select').click();
  }

  /**
   * Retrieve the data for the nth-transaction.
   * 0-based index
   */
  getNthTransaction(index) {
    const row = this.transactionTableRow.nth(index);
    const account = row.getByTestId('account');

    return {
      ...(account ? { account } : {}),
      payee: row.getByTestId('payee'),
      notes: row.getByTestId('notes'),
      category: row.getByTestId('category'),
      debit: row.getByTestId('debit'),
      credit: row.getByTestId('credit'),
    };
  }

  async clickSelectAction(action) {
    await this.selectButton.click();
    await this.selectTooltip.getByRole('button', { name: action }).click();
  }

  /**
   * Open the modal for closing the account.
   */
  async clickCloseAccount() {
    await this.menuButton.click();
    await this.page.getByRole('button', { name: 'Close Account' }).click();
    return new CloseAccountModal(
      this.page.locator('css=[aria-modal]'),
      this.page,
    );
  }

  /**
   * Open the filtering popover.
   */
  async filterBy(field) {
    await this.filterButton.click();
    await this.filterSelectTooltip.getByRole('button', { name: field }).click();

    return new FilterTooltip(this.page.getByTestId('filters-menu-tooltip'));
  }

  /**
   * Filter to a specific note
   */
  async filterByNote(note) {
    const filterTooltip = await this.filterBy('Note');
    await this.page.keyboard.type(note);
    await filterTooltip.applyButton.click();
  }

  /**
   * Remove the nth filter
   */
  async removeFilter(idx) {
    await this.page
      .getByRole('button', { name: 'Delete filter' })
      .nth(idx)
      .click();
  }

  async _fillTransactionFields(transactionRow, transaction) {
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

    if (transaction.account) {
      await transactionRow.getByTestId('account').click();
      await this.page.keyboard.type(transaction.account);
      await this.page.keyboard.press('Tab');
    }

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
  }
}

class FilterTooltip {
  constructor(page) {
    this.page = page;
    this.applyButton = page.getByRole('button', { name: 'Apply' });
  }
}

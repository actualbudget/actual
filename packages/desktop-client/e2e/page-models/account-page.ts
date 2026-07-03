import type { Locator, Page } from '@playwright/test';

import { CloseAccountModal } from './close-account-modal';

type TransactionEntry = {
  debit?: string;
  credit?: string;
  account?: string;
  payee?: string;
  notes?: string;
  category?: string;
};

export class AccountPage {
  readonly page: Page;
  readonly accountName: Locator;
  readonly accountBalance: Locator;
  readonly addNewTransactionButton: Locator;
  readonly newTransactionRow: Locator;
  readonly addTransactionButton: Locator;
  readonly cancelTransactionButton: Locator;
  readonly accountMenuButton: Locator;
  readonly transactionTable: Locator;
  readonly transactionTableRow: Locator;
  readonly filterButton: Locator;
  readonly filterSelectTooltip: Locator;
  readonly selectButton: Locator;
  readonly selectTooltip: Locator;
  readonly sidebarAllAccountsBalance: Locator;
  readonly sidebarOnBudgetBalance: Locator;
  readonly sidebarOffBudgetBalance: Locator;
  readonly reconcileButton: Locator;

  constructor(page: Page) {
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
    this.accountMenuButton = this.page.getByRole('button', {
      name: 'Account menu',
    });

    this.transactionTable = this.page.getByTestId('transaction-table');
    this.transactionTableRow = this.transactionTable.getByTestId('row');

    this.filterButton = this.page.getByRole('button', { name: 'Filter' });
    this.filterSelectTooltip = this.page.getByTestId('filters-select-tooltip');

    this.selectButton = this.page.getByTestId('transactions-select-button');
    this.selectTooltip = this.page.getByTestId('transactions-select-tooltip');

    this.sidebarAllAccountsBalance = this.page.getByTestId(
      'sidebar-all-accounts-balance',
    );
    this.sidebarOnBudgetBalance = this.page.getByTestId(
      'sidebar-on-budget-balance',
    );
    this.sidebarOffBudgetBalance = this.page.getByTestId(
      'sidebar-off-budget-balance',
    );

    this.reconcileButton = this.page.getByRole('button', {
      name: 'Reconcile',
      exact: true,
    });
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.transactionTable.waitFor(...options);
  }

  /**
   * Enter details of a transaction
   */
  async enterSingleTransaction(transaction: TransactionEntry) {
    await this.addNewTransactionButton.click();
    await this._fillTransactionFields(this.newTransactionRow, transaction);
  }

  /**
   * Finish adding a transaction
   */
  async addEnteredTransaction() {
    await this.addTransactionButton.click();
    await this.cancelTransactionButton.click();
  }

  /**
   * Create a single transaction
   */
  async createSingleTransaction(transaction: TransactionEntry) {
    await this.enterSingleTransaction(transaction);
    await this.addEnteredTransaction();
  }

  /**
   * Create split transactions
   */
  async createSplitTransaction([
    rootTransaction,
    ...transactions
  ]: TransactionEntry[]) {
    await this.addNewTransactionButton.click();

    // Root transaction
    const transactionRow = this.newTransactionRow.first();
    await this._fillTransactionFields(transactionRow, {
      ...rootTransaction,
      category: 'split',
    });

    // Splitting starts with two empty splits
    const initialSplitCount = 2;

    // Child transactions
    for (let i = 0; i < transactions.length; i++) {
      if (i >= initialSplitCount) {
        await this.page.getByRole('button', { name: 'Add Split' }).click();
      }

      await this._fillTransactionFields(
        this.newTransactionRow.nth(i + 1),
        transactions[i],
      );
    }

    await this.addTransactionButton.click();
    await this.cancelTransactionButton.click();
  }

  async selectNthTransaction(index: number) {
    const row = this.transactionTableRow.nth(index);
    await row.getByTestId('select').click();
  }

  /**
   * Retrieve the data for the nth-transaction.
   * 0-based index
   */
  getNthTransaction(index: number) {
    const row = this.transactionTableRow.nth(index);

    return this._getTransactionDetails(row);
  }

  getEnteredTransaction() {
    return this._getTransactionDetails(this.newTransactionRow);
  }

  _getTransactionDetails(row: Locator) {
    return {
      account: row.getByTestId('account'),
      payee: row.getByTestId('payee'),
      notes: row.getByTestId('notes'),
      category: row.getByTestId('category'),
      debit: row.getByTestId('debit'),
      credit: row.getByTestId('credit'),
    };
  }

  async clickSelectAction(action: string | RegExp) {
    await this.selectButton.click();
    await this.selectTooltip.getByRole('button', { name: action }).click();
  }

  /**
   * Toggle the "cleared" checkbox for the nth transaction.
   */
  async toggleCleared(index: number) {
    await this.transactionTableRow.nth(index).getByTestId('cleared').click();
  }

  /**
   * Edit an existing (already-saved) transaction's debit/credit amount.
   */
  async editTransactionAmount(
    index: number,
    field: 'debit' | 'credit',
    value: string,
  ) {
    const cell = this.transactionTableRow.nth(index).getByTestId(field);
    await cell.click();
    const input = cell.getByRole('textbox');
    await this.selectInputText(input);
    await input.pressSequentially(value);
    // Tab (not Enter) to commit — matches `_fillTransactionFields` below.
    // Enter appears to both submit and trigger a separate blur-commit,
    // double-firing the reconciled-transaction confirmation for a locked
    // transaction (surfaces as two stacked "Reconciled Transaction" modals).
    await this.page.keyboard.press('Tab');
  }

  /**
   * Select and delete the nth transaction via the selection toolbar. For a
   * reconciled transaction this only opens the "Reconciled Transaction"
   * warning — call `confirmReconciledTransactionWarning()` and then
   * `confirmDeleteModal()` (a second, generic "Confirm Delete" modal
   * always follows) to actually complete the deletion.
   */
  async deleteNthTransaction(index: number) {
    await this.selectNthTransaction(index);
    await this.clickSelectAction('Delete');
  }

  /**
   * The generic "Confirm Delete" modal that follows the reconciled-
   * transaction warning (or appears on its own for non-reconciled deletes).
   */
  async confirmDeleteModal() {
    await this.page.getByRole('button', { name: 'Delete' }).click();
  }

  /**
   * The "Reconciled Transaction" warning modal shown when editing or
   * deleting a transaction that's already reconciled.
   */
  get reconciledTransactionWarningHeading() {
    return this.page.getByRole('heading', { name: 'Reconciled Transaction' });
  }

  async confirmReconciledTransactionWarning() {
    await this.page.getByRole('button', { name: 'Confirm' }).click();
  }

  async cancelReconciledTransactionWarning() {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }

  /**
   * Open the reconcile menu (lock icon in the account header) and return
   * the popover locator.
   */
  async openReconcileMenu() {
    await this.reconcileButton.click();
    const popover = this.page.locator('[data-popover]');
    await popover.waitFor({ state: 'visible' });
    return popover;
  }

  /**
   * Submit a balance from an already-open reconcile popover. Leaves the
   * pre-filled cleared-balance value untouched if `balance` is omitted.
   */
  async submitReconcile(popover: Locator, balance?: string) {
    if (balance) {
      await popover.getByRole('textbox').fill(balance);
    }
    await popover.getByRole('button', { name: 'Reconcile' }).click();
  }

  /**
   * Open the reconcile menu and submit a balance in one step.
   */
  async reconcile(balance?: string) {
    const popover = await this.openReconcileMenu();
    await this.submitReconcile(popover, balance);
  }

  /**
   * Read the reconcile menu's status line ("Not yet reconciled" / "Reconciled
   * ... ago"), then close the popover.
   */
  async getReconcileStatusText() {
    const popover = await this.openReconcileMenu();
    const text = await popover
      .getByText(/Reconciled|Not yet reconciled/)
      .textContent();
    await this.page.keyboard.press('Escape');
    return text;
  }

  /**
   * The banner shown after submitting a reconcile balance. "Lock
   * transactions" (exact match) and "Exit reconciliation" (mismatch) are
   * the same underlying button with a state-dependent label.
   */
  get reconciliationAllReconciledText() {
    return this.page.getByText('All reconciled!');
  }

  get reconciliationDoneButton() {
    return this.page.getByRole('button', {
      name: /^(Lock transactions|Exit reconciliation)$/,
    });
  }

  get createReconciliationTransactionButton() {
    return this.page.getByRole('button', {
      name: 'Create reconciliation transaction',
    });
  }

  /**
   * Open the modal for closing the account.
   */
  async clickCloseAccount() {
    await this.accountMenuButton.click();
    await this.page.getByRole('button', { name: 'Close Account' }).click();
    return new CloseAccountModal(this.page.getByTestId('close-account-modal'));
  }

  /**
   * Open the filtering popover.
   */
  async filterBy(field: string | RegExp) {
    await this.filterButton.click();
    await this.filterSelectTooltip.getByRole('button', { name: field }).click();

    return new FilterTooltip(this.page.getByTestId('filters-menu-tooltip'));
  }

  /**
   * Filter to a specific note
   */
  async filterByNote(note: string) {
    const filterTooltip = await this.filterBy('Note');
    await this.page.keyboard.type(note);
    await filterTooltip.applyButton.click();
  }

  /**
   * Remove the nth filter
   */
  async removeFilter(idx: number) {
    await this.page
      .getByRole('button', { name: 'Delete filter' })
      .nth(idx)
      .click();
  }

  async _fillTransactionFields(
    transactionRow: Locator,
    transaction: TransactionEntry,
  ) {
    if (transaction.debit) {
      const debitCell = transactionRow.getByTestId('debit');
      await debitCell.click();
      const debitInput = debitCell.getByRole('textbox');
      await this.selectInputText(debitInput);
      await debitInput.pressSequentially(transaction.debit);
      await this.page.keyboard.press('Tab');
    }

    if (transaction.credit) {
      const creditCell = transactionRow.getByTestId('credit');
      await creditCell.click();
      const creditInput = creditCell.getByRole('textbox');
      await this.selectInputText(creditInput);
      await creditInput.pressSequentially(transaction.credit);
      await this.page.keyboard.press('Tab');
    }

    if (transaction.account) {
      const accountCell = transactionRow.getByTestId('account');
      await accountCell.click();
      const accountInput = accountCell.getByRole('textbox');
      await this.selectInputText(accountInput);
      await accountInput.pressSequentially(transaction.account);
      await this.page.keyboard.press('Tab');
    }

    if (transaction.payee) {
      const payeeCell = transactionRow.getByTestId('payee');
      await payeeCell.click();
      const payeeInput = payeeCell.getByRole('textbox');
      await this.selectInputText(payeeInput);
      await payeeInput.pressSequentially(transaction.payee);
      await this.page.keyboard.press('Tab');
    }

    if (transaction.notes) {
      const notesCell = transactionRow.getByTestId('notes');
      await notesCell.click();
      const notesInput = notesCell.getByRole('combobox');
      await this.selectInputText(notesInput);
      await notesInput.pressSequentially(transaction.notes);
      await this.page.keyboard.press('Tab');
    }

    if (transaction.category) {
      const categoryCell = transactionRow.getByTestId('category');
      await categoryCell.click();

      if (transaction.category === 'split') {
        await this.page.getByTestId('split-transaction-button').click();
      } else {
        const categoryInput = categoryCell.getByRole('textbox');
        await this.selectInputText(categoryInput);
        await categoryInput.pressSequentially(transaction.category);
        await this.page.keyboard.press('Tab');
      }
    }
  }

  async selectInputText(input: Locator) {
    const value = await input.inputValue();
    if (value) {
      await input.selectText();
    }
  }
}

class FilterTooltip {
  readonly locator: Locator;
  readonly applyButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.applyButton = locator.getByRole('button', { name: 'Apply' });
  }
}

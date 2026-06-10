import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base-page';
import type { TransactionData } from '../fixtures/test-data';

/**
 * TransactionPage encapsulates the inline transaction entry form that appears
 * inside the account view when "Add New" is clicked.
 *
 * This is NOT a standalone page — the form lives within `[data-testid="new-transaction"]`
 * inside the account's transaction table. The class is named "Page" to follow the
 * project's page-object naming convention.
 *
 * Cell interaction pattern:
 *   1. Click the cell (activates the inline editor)
 *   2. Interact with the revealed textbox / combobox within that cell
 *   3. Press Tab or Escape to commit / dismiss the field
 *
 * Assertions belong in spec files — this class only encapsulates user actions.
 */
export class TransactionPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Entry row ──────────────────────────────────────────────────────────────

  get newTransactionRow(): Locator {
    return this.getByTestId('new-transaction');
  }

  // ─── Field locators (scoped to the entry row) ────────────────────────────────

  get payeeCell(): Locator {
    return this.newTransactionRow.getByTestId('payee');
  }

  get notesCell(): Locator {
    return this.newTransactionRow.getByTestId('notes');
  }

  get categoryCell(): Locator {
    return this.newTransactionRow.getByTestId('category');
  }

  get debitCell(): Locator {
    return this.newTransactionRow.getByTestId('debit');
  }

  get creditCell(): Locator {
    return this.newTransactionRow.getByTestId('credit');
  }

  get saveButton(): Locator {
    return this.getByTestId('add-button');
  }

  get cancelButton(): Locator {
    return this.getByRole('button', { name: 'Cancel' });
  }

  // ─── Field actions ───────────────────────────────────────────────────────────

  async fillPayee(payee: string): Promise<void> {
    await this.payeeCell.click();
    await this.payeeCell.getByRole('textbox').fill(payee);
    // Dismiss the autocomplete dropdown without selecting a suggestion
    await this.page.keyboard.press('Escape');
  }

  async fillNotes(notes: string): Promise<void> {
    await this.notesCell.click();
    // The notes field renders as a combobox (has autocomplete suggestions)
    await this.notesCell.getByRole('combobox').fill(notes);
    await this.page.keyboard.press('Tab');
  }

  /**
   * Fills the amount field.
   * Pass `type: 'debit'` for outgoing / expense transactions,
   * `type: 'credit'` for incoming / income transactions.
   *
   * @param amount Absolute dollar value as a string, e.g. "75.00"
   */
  async fillAmount(amount: string, type: 'debit' | 'credit'): Promise<void> {
    const cell = type === 'debit' ? this.debitCell : this.creditCell;
    await cell.click();
    await cell.getByRole('textbox').fill(amount);
    await this.page.keyboard.press('Tab');
  }

  // ─── Composite helpers ───────────────────────────────────────────────────────

  /**
   * Fills all provided fields in the `TransactionData` object.
   * Fields are filled in the natural tab order: payee → notes → amount.
   */
  async fill(data: TransactionData): Promise<void> {
    await this.fillPayee(data.payee);

    if (data.notes !== undefined) {
      await this.fillNotes(data.notes);
    }

    await this.fillAmount(String(data.amount), data.type);
  }

  /**
   * Saves the transaction by clicking the add button, then immediately
   * clicks Cancel to dismiss the blank row the form resets to after saving.
   */
  async save(): Promise<void> {
    await this.saveButton.click();
    await this.cancelButton.click();
    await this.newTransactionRow.waitFor({ state: 'hidden' });
  }

  /**
   * Discards the in-progress transaction without saving.
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.newTransactionRow.waitFor({ state: 'hidden' });
  }
}

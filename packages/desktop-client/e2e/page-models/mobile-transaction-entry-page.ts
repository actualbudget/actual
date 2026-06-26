import type { Locator, Page } from '@playwright/test';

import { MobileAccountPage } from './mobile-account-page';

export class MobileTransactionEntryPage {
  readonly page: Page;
  readonly header: Locator;
  readonly amountField: Locator;
  readonly transactionForm: Locator;
  readonly footer: Locator;
  readonly addTransactionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByRole('heading');
    this.transactionForm = page.getByTestId('transaction-form');
    this.amountField = this.transactionForm.getByTestId('amount-input');
    this.footer = page.getByTestId('transaction-form-footer');
    this.addTransactionButton = this.footer.getByRole('button', {
      name: 'Add transaction',
    });
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.transactionForm.waitFor(...options);
  }

  async fillAmount(value: string) {
    await this.amountField.fill(value);
    await this.amountField.evaluate(el => (el as HTMLInputElement).blur());
    // TransactionEdit.onUpdate runs an async rules-run before setTransactions,
    // so wait for the outer display button (reads props.value) to reflect the
    // committed amount before the next fillField snapshots the transaction.
    await this.transactionForm
      .getByRole('button')
      .filter({ hasText: value })
      .waitFor();
  }

  async fillField(fieldLocator: Locator, content: string) {
    await fieldLocator.click();
    const comboboxInput = this.page.getByRole('combobox').locator('input');
    // pressSequentially + option click: fill()+Enter breaks the autocomplete
    // highlight and selects "None"/wrong entry under CPU contention.
    await comboboxInput.pressSequentially(content);
    await this.page
      .getByRole('option')
      .filter({ hasText: content })
      .first()
      .click();
    await comboboxInput.waitFor({ state: 'hidden' });
    await fieldLocator.filter({ hasText: content }).waitFor();
  }

  async createTransaction() {
    await this.addTransactionButton.click();

    return new MobileAccountPage(this.page);
  }
}

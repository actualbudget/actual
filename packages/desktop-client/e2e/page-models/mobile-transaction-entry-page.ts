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

  async fillField(fieldLocator: Locator, content: string) {
    await fieldLocator.click();
    await this.page.locator('css=[role=combobox] input').fill(content);
    await this.page.keyboard.press('Enter');
  }

  async createTransaction() {
    await this.addTransactionButton.click();

    return new MobileAccountPage(this.page);
  }
}

import { expect, type Locator, type Page } from '@playwright/test';

import { MobileAccountPage } from './mobile-account-page';

export class MobileTransactionEntryPage {
  readonly page: Page;
  readonly header: Locator;
  readonly amountField: Locator;
  readonly amountDisplayButton: Locator;
  readonly transactionForm: Locator;
  readonly splitButton: Locator;
  readonly footer: Locator;
  readonly addTransactionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page
      .getByRole('heading', { level: 1 })
      .filter({ hasText: /^(New Transaction|Transaction)$/ });
    this.transactionForm = page.getByTestId('transaction-form');
    this.amountField = this.transactionForm.getByTestId('amount-input');
    this.amountDisplayButton =
      this.transactionForm.getByTestId('amount-display');
    this.splitButton = this.transactionForm.getByRole('button', {
      name: 'Split',
    });
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

  async openAmountKeypad() {
    // If the amount is not currently being edited, tap the display button.
    if (await this.amountDisplayButton.isVisible()) {
      await this.amountDisplayButton.click();
    } else {
      // Otherwise, trigger the keypad via pointer interaction on the input.
      await this.amountField.dispatchEvent('pointerdown');
      await this.amountField.focus();
    }

    await expect(this.page.getByTestId('money-keypad-modal')).toBeVisible();
  }

  async pressKeypadSequence(keys: string[]) {
    const keypad = this.page.getByTestId('money-keypad-modal');
    await expect(keypad).toBeVisible();

    for (const key of keys) {
      await keypad.getByRole('button', { name: key }).click();
    }
  }

  async enterAmountWithKeypad(amount: string) {
    await this.openAmountKeypad();

    const keypad = this.page.getByTestId('money-keypad-modal');
    await keypad.getByRole('button', { name: 'Clear' }).click();
    await this.pressKeypadSequence(amount.split(''));
    await keypad.getByRole('button', { name: 'Done' }).click();
    await expect(keypad).toHaveCount(0);
  }

  async createTransaction() {
    await this.addTransactionButton.click();

    return new MobileAccountPage(this.page);
  }

  childAmountInputs() {
    return this.page.locator('[data-testid^=child-amount-input-]');
  }

  async splitTransaction() {
    await this.splitButton.click();
  }
}

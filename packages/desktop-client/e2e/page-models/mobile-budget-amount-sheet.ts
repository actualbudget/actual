import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export class BudgetAmountSheet {
  readonly page: Page;
  readonly locator: Locator;
  readonly amountInput: Locator;
  readonly editNotesRow: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.amountInput = locator.getByTestId('amount-input');
    this.editNotesRow = locator.getByRole('button', { name: 'Edit notes' });
  }

  async close() {
    await this.locator.press('Escape');
  }

  async openNotes() {
    await this.editNotesRow.click();

    return this.page.getByRole('dialog', { name: 'Modal dialog' });
  }

  async setBudgetAmount(newAmount: string) {
    await expect(this.amountInput).toBeVisible();
    await expect(this.amountInput).toBeFocused();
    await this.amountInput.fill(newAmount);
    await this.amountInput.blur();
    await this.close();
  }
}

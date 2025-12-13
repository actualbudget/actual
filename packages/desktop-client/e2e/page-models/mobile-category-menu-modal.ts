import { expect, type Locator, type Page } from '@playwright/test';

import { EditNotesModal } from './mobile-edit-notes-modal';

export class CategoryMenuModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly budgetAmountInput: Locator;
  readonly editNotesButton: Locator;
  readonly moneyKeypadModal: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.budgetAmountInput = locator.getByTestId('amount-input');
    this.editNotesButton = locator.getByRole('button', { name: 'Edit notes' });

    this.moneyKeypadModal = this.page.getByTestId('money-keypad-modal');
  }

  private async dismissKeypadIfOpen() {
    if (await this.moneyKeypadModal.isVisible()) {
      await this.moneyKeypadModal
        .getByRole('button', { name: 'Close' })
        .click();
      await expect(this.moneyKeypadModal).toHaveCount(0);
    }
  }

  async close() {
    await this.dismissKeypadIfOpen();
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }

  async editNotes() {
    await this.dismissKeypadIfOpen();
    await this.editNotesButton.click();

    return new EditNotesModal(
      this.page.getByRole('dialog', {
        name: 'Modal dialog',
      }),
    );
  }
}

import { type Locator, type Page } from '@playwright/test';

import { EditNotesModal } from './mobile-edit-notes-modal';

export class CategoryMenuModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly budgetAmountInput: Locator;
  readonly editNotesButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.budgetAmountInput = locator.getByTestId('amount-input');
    this.editNotesButton = locator.getByRole('button', { name: 'Edit notes' });
  }

  async close() {
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }

  async editNotes() {
    await this.editNotesButton.click();

    return new EditNotesModal(
      this.page.getByRole('dialog', {
        name: 'Modal dialog',
      }),
    );
  }
}

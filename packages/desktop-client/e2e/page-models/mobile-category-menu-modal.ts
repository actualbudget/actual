import type { Locator, Page } from '@playwright/test';

import { EditNotesModal } from './mobile-edit-notes-modal';

export class CategoryMenuModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly budgetAmountInput: Locator;
  readonly editNotesButton: Locator;
  readonly budgetAutomationsButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.budgetAmountInput = locator.getByTestId('amount-input');
    this.editNotesButton = locator.getByRole('button', { name: 'Edit notes' });
    this.budgetAutomationsButton = locator.getByRole('button', {
      name: 'Budget automations',
    });
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

  async editAutomations() {
    await this.budgetAutomationsButton.click();

    return this.page.getByRole('dialog', { name: 'Modal dialog' });
  }
}

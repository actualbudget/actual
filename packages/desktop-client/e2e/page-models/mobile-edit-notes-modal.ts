import type { Locator, Page } from '@playwright/test';

export class EditNotesModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly textArea: Locator;
  readonly saveNotesButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.textArea = locator.getByRole('textbox');
    this.saveNotesButton = locator.getByRole('button', { name: 'Save notes' });
  }

  async close() {
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }

  async updateNotes(notes: string) {
    await this.textArea.fill(notes);
    await this.saveNotesButton.click();
  }
}

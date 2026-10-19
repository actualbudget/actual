import type { Locator, Page } from '@playwright/test';

export class CategoryGroupActionsSheet {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly addCategoryRow: Locator;
  readonly renameRow: Locator;
  readonly deleteGroupRow: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.addCategoryRow = locator.getByRole('button', {
      name: 'Add category',
    });
    this.renameRow = locator.getByRole('button', { name: 'Rename' });
    this.deleteGroupRow = locator.getByRole('button', {
      name: 'Delete',
      exact: true,
    });
  }

  async close() {
    await this.locator.press('Escape');
  }

  async delete() {
    await this.deleteGroupRow.click();
  }
}

import type { Locator, Page } from '@playwright/test';

export class CategoryGroupMenuModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly addCategoryButton: Locator;
  readonly deleteButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.addCategoryButton = locator.getByRole('button', {
      name: 'Add category',
    });
    this.deleteButton = locator.getByRole('button', {
      name: 'Delete',
      exact: true,
    });
  }

  async close() {
    await this.page.keyboard.press('Escape');
  }

  async delete() {
    await this.deleteButton.click();
  }
}

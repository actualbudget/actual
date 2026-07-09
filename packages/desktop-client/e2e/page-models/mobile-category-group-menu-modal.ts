import type { Locator, Page } from '@playwright/test';

export class CategoryGroupMenuModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly menuButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.menuButton = this.heading.getByRole('button', { name: 'Menu' });
  }

  async delete() {
    await this.menuButton.click();
    await this.page
      .locator('[data-popover]')
      .getByRole('button', { name: 'Delete' })
      .click();
  }
}

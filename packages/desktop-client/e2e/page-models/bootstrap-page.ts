import type { Page } from '@playwright/test';

export class BootstrapPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  getHeading() {
    return this.page.getByRole('heading');
  }
}

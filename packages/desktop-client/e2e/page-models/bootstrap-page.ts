import type { Locator, Page } from '@playwright/test';

export class BootstrapPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading');
  }
}

import type { Locator, Page } from '@playwright/test';

import { AccountPage } from './account-page';
import { BudgetPage } from './budget-page';

export class BootstrapPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading');
  }
}

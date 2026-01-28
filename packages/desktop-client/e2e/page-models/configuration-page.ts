import type { Locator, Page } from '@playwright/test';

import { AccountPage } from './account-page';
import { BudgetPage } from './budget-page';

export class ConfigurationPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading');
  }

  async createTestFile() {
    await this.page.getByRole('button', { name: 'Create test file' }).click();
    return new BudgetPage(this.page);
  }

  async clickOnNoServer() {
    await this.page.getByRole('button', { name: "Don't use a server" }).click();
  }

  async startFresh() {
    await this.page.getByRole('button', { name: 'Start fresh' }).click();

    return new AccountPage(this.page);
  }

  async importBudget(type: 'YNAB4' | 'nYNAB' | 'Actual', file: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.getByRole('button', { name: 'Import my budget' }).click();

    switch (type) {
      case 'YNAB4':
        await this.page
          .getByRole('button', {
            name: 'YNAB4 The old unsupported desktop app',
          })
          .click();
        await this.page
          .getByRole('button', { name: 'Select zip file...' })
          .click();
        break;

      case 'nYNAB':
        await this.page
          .getByRole('button', { name: 'nYNAB The newer web app' })
          .click();
        await this.page.getByRole('button', { name: 'Select file...' }).click();
        break;

      case 'Actual':
        await this.page
          .getByRole('button', {
            name: 'Actual Import a file exported from Actual',
          })
          .click();
        await this.page.getByRole('button', { name: 'Select file...' }).click();
        break;

      default:
        throw new Error(`Unrecognized import type: ${type}`);
    }

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);

    return new BudgetPage(this.page);
  }
}

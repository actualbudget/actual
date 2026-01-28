import type { Locator, Page } from '@playwright/test';

export class CloseAccountModal {
  readonly locator: Locator;
  readonly page: Page;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();
  }

  async selectTransferAccount(accountName: string) {
    await this.locator.getByPlaceholder('Select account...').fill(accountName);
    await this.page.keyboard.press('Enter');
  }

  async closeAccount() {
    await this.locator.getByRole('button', { name: 'Close account' }).click();
  }
}

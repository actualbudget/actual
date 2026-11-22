import type { Locator, Page } from '@playwright/test';

export class BankSyncPage {
  readonly page: Page;
  readonly description: Locator;
  readonly serverRequiredMessage: Locator;
  readonly linkBankAccountButton: Locator;
  readonly menuButton: Locator;
  readonly providerList: Locator;
  readonly linkAccountsDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.description = page.getByText(
      /Bank sync downloads transactions from your bank/,
    );
    this.serverRequiredMessage = page.getByTestId('bank-sync-server-required');
    this.linkBankAccountButton = page.getByRole('button', {
      name: 'Link bank account',
    });
    this.menuButton = page.getByRole('button', { name: 'Menu', exact: true });
    this.providerList = page.getByRole('list', { name: 'Providers' });
    this.linkAccountsDialog = page.getByTestId('select-linked-accounts-modal');
  }

  async waitToLoad() {
    await this.page.waitForSelector('text=Bank Sync', { timeout: 10000 });
  }

  getProviderRow(id: string) {
    return this.page.getByTestId(`bank-sync-provider-${id}`);
  }

  getAccountRow(name: string) {
    return this.page.getByTestId('row').filter({ hasText: name });
  }
}

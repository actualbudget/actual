import type { Locator, Page } from '@playwright/test';

export class MobileBankSyncPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly accountsList: Locator;
  readonly accountRows: Locator;
  readonly serverRequiredMessage: Locator;
  readonly menuButton: Locator;
  readonly linkBankAccountButton: Locator;
  readonly providerList: Locator;
  readonly linkAccountsDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder(/Filter accounts/i);
    this.accountsList = page.getByRole('main');
    this.accountRows = page.getByRole('grid').getByRole('row');
    this.serverRequiredMessage = page.getByTestId('bank-sync-server-required');
    this.menuButton = page.getByRole('button', { name: 'Bank sync menu' });
    this.linkBankAccountButton = page.getByRole('button', {
      name: 'Link bank account',
      exact: true,
    });
    this.providerList = page.getByRole('list', { name: 'Providers' });
    this.linkAccountsDialog = page.getByTestId('select-linked-accounts-modal');
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.accountsList.waitFor(options);
  }

  async waitToLoad() {
    await this.page.waitForSelector('text=Bank Sync', { timeout: 10000 });
  }

  async searchFor(term: string) {
    await this.searchBox.fill(term);
  }

  getProviderRow(id: string) {
    return this.page.getByTestId(`bank-sync-provider-${id}`);
  }

  getAccountRow(name: string | RegExp) {
    return this.page.getByRole('row', { name });
  }
}

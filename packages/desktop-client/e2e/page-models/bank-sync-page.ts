import type { Locator, Page } from '@playwright/test';

export class BankSyncPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly providersHeading: Locator;
  readonly setupButton: Locator;
  readonly disabledSetupButton: Locator;
  readonly providerCards: Locator;
  readonly goCardlessProvider: Locator;
  readonly simpleFinProvider: Locator;
  readonly pluggyAiProvider: Locator;
  readonly addAccountMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText('Bank Sync', { exact: true }).first();
    this.providersHeading = page.getByText('Providers', { exact: true });
    this.setupButton = page.getByRole('button', { name: 'Set up bank sync' });
    this.disabledSetupButton = this.setupButton;
    this.providerCards = page.locator('[data-testid^="bank-sync-provider-"]');
    this.goCardlessProvider = page.getByTestId('bank-sync-provider-goCardless');
    this.simpleFinProvider = page.getByTestId('bank-sync-provider-simpleFin');
    this.pluggyAiProvider = page.getByTestId('bank-sync-provider-pluggyai');
    this.addAccountMessage = page.getByText(
      'To use the bank syncing features, you must first add an account.',
      { exact: true },
    );
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.page.waitForURL('**/bank-sync', { timeout: options?.timeout });
    await this.heading.waitFor({
      state: options?.state === 'hidden' ? 'hidden' : 'visible',
      timeout: options?.timeout,
    });
  }

  async waitToLoad() {
    await this.waitFor({ timeout: 10000 });
  }
}

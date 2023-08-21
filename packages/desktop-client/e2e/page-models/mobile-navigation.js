import { MobileAccountsPage } from './mobile-accounts-page';
import { MobileBudgetPage } from './mobile-budget-page';
import { MobileTransactionEntryPage } from './mobile-transaction-entry-page';
import { SettingsPage } from './settings-page';

export class MobileNavigation {
  constructor(page) {
    this.page = page;
  }

  async goToBudgetPage() {
    const link = this.page.getByRole('link', { name: 'Budget' });
    await link.click();

    return new MobileBudgetPage(this.page);
  }

  async goToAccountsPage() {
    const link = this.page.getByRole('link', { name: 'Accounts' });
    await link.click();

    return new MobileAccountsPage(this.page);
  }

  async goToTransactionEntryPage() {
    const link = this.page.getByRole('link', { name: 'Transaction' });
    await link.click();

    return new MobileTransactionEntryPage(this.page);
  }

  async goToSettingsPage() {
    const link = this.page.getByRole('link', { name: 'Settings' });
    await link.click();

    return new SettingsPage(this.page);
  }
}

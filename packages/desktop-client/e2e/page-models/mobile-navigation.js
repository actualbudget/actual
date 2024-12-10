import { MobileAccountPage } from './mobile-account-page';
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

  async goToUncategorizedPage() {
    const button = this.page.getByRole('button', { name: /uncategorized/ });
    await button.click();

    return new MobileAccountPage(this.page);
  }

  async goToTransactionEntryPage() {
    const link = this.page.getByRole('link', { name: 'Transaction' });
    await link.click();

    return new MobileTransactionEntryPage(this.page);
  }

  async goToSettingsPage() {
    await this.dragNavbarUp();

    const link = this.page.getByRole('link', { name: 'Settings' });
    await link.click();

    return new SettingsPage(this.page);
  }

  async dragNavbarUp() {
    await this.page
      .getByRole('navigation')
      .dragTo(this.page.getByTestId('budget-table'));
  }
}

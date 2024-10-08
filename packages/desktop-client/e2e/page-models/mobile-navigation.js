import { MobileAccountPage } from './mobile-account-page';
import { MobileAccountsPage } from './mobile-accounts-page';
import { MobileBudgetPage } from './mobile-budget-page';
import { MobileReportsPage } from './mobile-reports-page';
import { MobileTransactionEntryPage } from './mobile-transaction-entry-page';
import { SettingsPage } from './settings-page';

export class MobileNavigation {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading');
    this.navbar = page.getByRole('navigation');
  }

  ROW_HEIGHT = 70;

  async dragNavbarUp() {
    await this.navbar.dragTo(this.heading);
  }

  async dragNavbarDown() {
    await this.navbar.dragTo(this.navbar, {
      sourcePosition: { x: 1, y: 0 },
      targetPosition: { x: 1, y: this.ROW_HEIGHT },
    });
  }

  async hasNavbarState(...states) {
    const dataNavbarState = await this.navbar.getAttribute('data-navbar-state');
    return states.includes(dataNavbarState);
  }

  async goToBudgetPage() {
    const budgetPage = new MobileBudgetPage(this.page);

    if (this.page.url().endsWith('/budget')) {
      return budgetPage;
    }

    await this.navbar.waitFor();

    if (await this.hasNavbarState('hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.page.getByRole('link', { name: 'Budget' });
    await link.click();

    await budgetPage.waitFor();

    if (await this.hasNavbarState('open')) {
      await this.dragNavbarDown();
    }

    return budgetPage;
  }

  async goToAccountsPage() {
    const accountsPage = new MobileAccountsPage(this.page);

    if (this.page.url().endsWith('/accounts')) {
      return accountsPage;
    }

    await this.navbar.waitFor();

    if (await this.hasNavbarState('hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.page.getByRole('link', { name: 'Accounts' });
    await link.click();

    await accountsPage.waitFor();

    if (await this.hasNavbarState('open')) {
      await this.dragNavbarDown();
    }

    return accountsPage;
  }

  async goToUncategorizedPage() {
    const button = this.page.getByRole('button', { name: /uncategorized/ });
    await button.click();

    return new MobileAccountPage(this.page);
  }

  async goToTransactionEntryPage() {
    const transactionEntryPage = new MobileTransactionEntryPage(this.page);

    if (this.page.url().endsWith('/transactions/new')) {
      return transactionEntryPage;
    }

    await this.navbar.waitFor();

    if (await this.hasNavbarState('hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.navbar.getByRole('link', { name: 'Transaction' });
    await link.click();

    await transactionEntryPage.waitFor();

    return transactionEntryPage;
  }

  async goToReportsPage() {
    const reportsPage = new MobileReportsPage(this.page);
    if (this.page.url().endsWith('/reports')) {
      return reportsPage;
    }

    await this.navbar.waitFor();

    if (await this.hasNavbarState('default', 'hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.navbar.getByRole('link', { name: 'Reports' });
    await link.click();

    await reportsPage.waitFor();

    if (await this.hasNavbarState('open')) {
      await this.dragNavbarDown();
    }

    return reportsPage;
  }

  async goToSettingsPage() {
    const settingsPage = new SettingsPage(this.page);
    if (this.page.url().endsWith('/settings')) {
      return settingsPage;
    }

    await this.navbar.waitFor();

    if (await this.hasNavbarState('default', 'hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.navbar.getByRole('link', { name: 'Settings' });
    await link.click();

    await settingsPage.waitFor();

    if (await this.hasNavbarState('open')) {
      await this.dragNavbarDown();
    }

    return settingsPage;
  }
}

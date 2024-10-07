import { MobileAccountsPage } from './mobile-accounts-page';
import { MobileBudgetPage } from './mobile-budget-page';
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
    if (this.page.url().endsWith('/budget')) {
      return new MobileBudgetPage(this.page);
    }

    if (await this.hasNavbarState('hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.page.getByRole('link', { name: 'Budget' });
    await link.click();

    if (await this.hasNavbarState('open')) {
      await this.dragNavbarDown();
    }

    return new MobileBudgetPage(this.page);
  }

  async goToAccountsPage() {
    if (this.page.url().endsWith('/accounts')) {
      return new MobileAccountsPage(this.page);
    }

    if (await this.hasNavbarState('hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.page.getByRole('link', { name: 'Accounts' });
    await link.click();

    if (await this.hasNavbarState('open')) {
      await this.dragNavbarDown();
    }

    return new MobileAccountsPage(this.page);
  }

  async goToTransactionEntryPage() {
    if (this.page.url().endsWith('/transactions/new')) {
      return new MobileTransactionEntryPage(this.page);
    }

    if (await this.hasNavbarState('hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.navbar.getByRole('link', { name: 'Transaction' });
    await link.click();

    return new MobileTransactionEntryPage(this.page);
  }

  async goToReportsPage() {
    if (this.page.url().endsWith('/reports')) {
      return new MobileTransactionEntryPage(this.page);
    }

    if (await this.hasNavbarState('hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.navbar.getByRole('link', { name: 'Reports' });
    await link.click();

    return new MobileTransactionEntryPage(this.page);
  }

  async goToSettingsPage() {
    if (this.page.url().endsWith('/settings')) {
      return new SettingsPage(this.page);
    }

    if (await this.hasNavbarState('default', 'hidden')) {
      await this.dragNavbarUp();
    }

    const link = this.navbar.getByRole('link', { name: 'Settings' });
    await link.click();

    if (await this.hasNavbarState('open')) {
      await this.dragNavbarDown();
    }

    return new SettingsPage(this.page);
  }
}

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
    this.mainContentSelector = '[role=main]';
    this.navbarSelector = '[role=navigation]';
  }

  static #NAVBAR_ROWS = 3;
  static #NAV_LINKS_HIDDEN_BY_DEFAULT = [
    'Reports',
    'Schedules',
    'Payees',
    'Rules',
    'Settings',
  ];
  static #ROUTES_BY_PAGE = {
    Budget: '/budget',
    Accounts: '/accounts',
    Transactions: '/transactions/new',
    Reports: '/reports',
    Settings: '/settings',
  };

  async dragNavbarUp() {
    const mainContentBoundingBox = await this.page
      .locator(this.mainContentSelector)
      .boundingBox();

    const navbarBoundingBox = await this.page
      .locator(this.navbarSelector)
      .boundingBox();

    await this.page.dragAndDrop(this.navbarSelector, this.mainContentSelector, {
      sourcePosition: { x: 1, y: 0 },
      targetPosition: {
        x: 1,
        y: mainContentBoundingBox.height - navbarBoundingBox.height,
      },
    });
  }

  async dragNavbarDown() {
    const boundingBox = await this.page
      .locator(this.navbarSelector)
      .boundingBox();

    await this.page.dragAndDrop(this.navbarSelector, this.navbarSelector, {
      sourcePosition: { x: 1, y: 0 },
      targetPosition: {
        x: 1,
        // Only scroll until bottom of screen i.e. bottom of first navbar row.
        y: boundingBox.height / MobileNavigation.#NAVBAR_ROWS,
      },
    });
  }

  async hasNavbarState(...states) {
    if ((await this.navbar.count()) === 0) {
      // No navbar on page.
      return false;
    }

    const dataNavbarState = await this.navbar.getAttribute('data-navbar-state');
    return states.includes(dataNavbarState);
  }

  async navigateToPage(pageName, pageModelFactory) {
    const pageInstance = pageModelFactory();

    if (this.page.url().endsWith(MobileNavigation.#ROUTES_BY_PAGE[pageName])) {
      // Already on the page.
      return pageInstance;
    }

    await this.navbar.waitFor();

    const navbarStates = MobileNavigation.#NAV_LINKS_HIDDEN_BY_DEFAULT.includes(
      pageName,
    )
      ? ['default', 'hidden']
      : ['hidden'];

    if (await this.hasNavbarState(...navbarStates)) {
      await this.dragNavbarUp();
    }

    const link = this.navbar.getByRole('link', { name: pageName });
    await link.click();

    await pageInstance.waitFor();

    if (await this.hasNavbarState('open')) {
      await this.dragNavbarDown();
    }

    return pageInstance;
  }

  async goToBudgetPage() {
    return this.navigateToPage('Budget', () => new MobileBudgetPage(this.page));
  }

  async goToAccountsPage() {
    return this.navigateToPage(
      'Accounts',
      () => new MobileAccountsPage(this.page),
    );
  }

  async goToUncategorizedPage() {
    const button = this.page.getByRole('button', { name: /uncategorized/ });
    await button.click();

    return new MobileAccountPage(this.page);
  }

  async goToTransactionEntryPage() {
    return this.navigateToPage(
      'Transaction',
      () => new MobileTransactionEntryPage(this.page),
    );
  }

  async goToReportsPage() {
    return this.navigateToPage(
      'Reports',
      () => new MobileReportsPage(this.page),
    );
  }

  async goToSettingsPage() {
    return this.navigateToPage('Settings', () => new SettingsPage(this.page));
  }
}

import { type Locator, type Page } from '@playwright/test';

import { MobileAccountPage } from './mobile-account-page';
import { MobileAccountsPage } from './mobile-accounts-page';
import { MobileBudgetPage } from './mobile-budget-page';
import { MobileReportsPage } from './mobile-reports-page';
import { MobileRulesPage } from './mobile-rules-page';
import { MobileTransactionEntryPage } from './mobile-transaction-entry-page';
import { SettingsPage } from './settings-page';

const NAVBAR_ROWS = 3;
const NAV_LINKS_HIDDEN_BY_DEFAULT = [
  'Reports',
  'Schedules',
  'Payees',
  'Rules',
  'Settings',
];
const ROUTES_BY_PAGE = {
  Budget: '/budget',
  Accounts: '/accounts',
  Transaction: '/transactions/new',
  Reports: '/reports',
  Rules: '/rules',
  Settings: '/settings',
};

export class MobileNavigation {
  readonly page: Page;
  readonly heading: Locator;
  readonly navbar: Locator;
  readonly mainContentSelector: string;
  readonly navbarSelector: string;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading');
    this.navbar = page.getByRole('navigation');
    this.mainContentSelector = '[role=main]';
    this.navbarSelector = '[role=navigation]';
  }

  async dragNavbarUp() {
    const mainContentBoundingBox = await this.page
      .locator(this.mainContentSelector)
      .boundingBox();

    if (!mainContentBoundingBox) {
      throw new Error('Unable to get bounding box of main content.');
    }

    const navbarBoundingBox = await this.page
      .locator(this.navbarSelector)
      .boundingBox();

    if (!navbarBoundingBox) {
      throw new Error('Unable to get bounding box of navbar.');
    }

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

    if (!boundingBox) {
      throw new Error('Unable to get bounding box of navbar.');
    }

    await this.page.dragAndDrop(this.navbarSelector, this.navbarSelector, {
      sourcePosition: { x: 1, y: 0 },
      targetPosition: {
        x: 1,
        // Only scroll until bottom of screen i.e. bottom of first navbar row.
        y: boundingBox.height / NAVBAR_ROWS,
      },
    });
  }

  async hasNavbarState(...states: string[]) {
    if ((await this.navbar.count()) === 0) {
      // No navbar on page.
      return false;
    }

    const dataNavbarState = await this.navbar.getAttribute('data-navbar-state');
    if (!dataNavbarState) {
      throw new Error('Navbar does not have data-navbar-state attribute.');
    }
    return states.includes(dataNavbarState);
  }

  async navigateToPage<T extends { waitFor: Locator['waitFor'] }>(
    pageName: keyof typeof ROUTES_BY_PAGE,
    pageModelFactory: () => T,
  ): Promise<T> {
    const pageInstance = pageModelFactory();

    if (this.page.url().endsWith(ROUTES_BY_PAGE[pageName])) {
      // Already on the page.
      return pageInstance;
    }

    await this.navbar.waitFor();

    const navbarStates = NAV_LINKS_HIDDEN_BY_DEFAULT.includes(pageName)
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
    return await this.navigateToPage(
      'Budget',
      () => new MobileBudgetPage(this.page),
    );
  }

  async goToAccountsPage() {
    return await this.navigateToPage(
      'Accounts',
      () => new MobileAccountsPage(this.page),
    );
  }

  async goToUncategorizedPage() {
    const button = this.page.getByRole('button', { name: 'Categorize' });
    await button.click();

    return new MobileAccountPage(this.page);
  }

  async goToTransactionEntryPage() {
    return await this.navigateToPage(
      'Transaction',
      () => new MobileTransactionEntryPage(this.page),
    );
  }

  async goToReportsPage() {
    return await this.navigateToPage(
      'Reports',
      () => new MobileReportsPage(this.page),
    );
  }

  async goToRulesPage() {
    return await this.navigateToPage(
      'Rules',
      () => new MobileRulesPage(this.page),
    );
  }

  async goToSettingsPage() {
    return await this.navigateToPage(
      'Settings',
      () => new SettingsPage(this.page),
    );
  }
}

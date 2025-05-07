import { type Page } from '@playwright/test';

import { AccountPage } from '@desktop-client/e2e/page-models/account-page';
import { PayeesPage } from '@desktop-client/e2e/page-models/payees-page';
import { ReportsPage } from '@desktop-client/e2e/page-models/reports-page';
import { RulesPage } from '@desktop-client/e2e/page-models/rules-page';
import { SchedulesPage } from '@desktop-client/e2e/page-models/schedules-page';
import { SettingsPage } from '@desktop-client/e2e/page-models/settings-page';

type AccountEntry = {
  name: string;
  balance: number;
  offBudget: boolean;
};

export class Navigation {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goToAccountPage(accountName: string) {
    await this.page
      .getByRole('link', { name: new RegExp(`^${accountName}`) })
      .click();

    return new AccountPage(this.page);
  }

  async goToReportsPage() {
    await this.page.getByRole('link', { name: 'Reports' }).click();

    return new ReportsPage(this.page);
  }

  async goToSchedulesPage() {
    await this.page.getByRole('link', { name: 'Schedules' }).click();

    return new SchedulesPage(this.page);
  }

  async goToRulesPage() {
    const rulesLink = this.page.getByRole('link', { name: 'Rules' });

    // Expand the "more" menu only if it is not already expanded
    if (!(await rulesLink.isVisible())) {
      await this.page.getByRole('button', { name: 'More' }).click();
    }

    await rulesLink.click();

    return new RulesPage(this.page);
  }

  async goToPayeesPage() {
    const payeesLink = this.page.getByRole('link', { name: 'Payees' });

    // Expand the "More" menu only if the Payees link is not visible
    if (!(await payeesLink.isVisible())) {
      await this.page.getByRole('button', { name: 'More' }).click();
    }

    await payeesLink.click();

    return new PayeesPage(this.page);
  }

  async goToSettingsPage() {
    const settingsLink = this.page.getByRole('link', { name: 'Settings' });

    // Expand the "more" menu only if it is not already expanded
    if (!(await settingsLink.isVisible())) {
      await this.page.getByRole('button', { name: 'More' }).click();
    }

    await settingsLink.click();

    return new SettingsPage(this.page);
  }

  async createAccount(data: AccountEntry) {
    await this.page.getByRole('button', { name: 'Add account' }).click();
    await this.page
      .getByRole('button', { name: 'Create a local account' })
      .click();

    // Fill the form
    await this.page.getByLabel('Name:').fill(data.name);
    await this.page.getByLabel('Balance:').fill(String(data.balance));

    if (data.offBudget) {
      await this.page.getByLabel('Off budget').click();
    }

    await this.page
      .getByRole('button', { name: 'Create', exact: true })
      .click();
    return new AccountPage(this.page);
  }

  async clickOnNoServer() {
    await this.page.getByRole('button', { name: 'No server' }).click();
  }
}

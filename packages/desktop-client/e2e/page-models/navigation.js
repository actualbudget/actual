import { AccountPage } from './account-page';
import { ReportsPage } from './reports-page';
import { RulesPage } from './rules-page';
import { SchedulesPage } from './schedules-page';
import { SettingsPage } from './settings-page';

export class Navigation {
  constructor(page) {
    this.page = page;
  }

  async goToAccountPage(accountName) {
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

  async goToSettingsPage() {
    const settingsLink = this.page.getByRole('link', { name: 'Settings' });

    // Expand the "more" menu only if it is not already expanded
    if (!(await settingsLink.isVisible())) {
      await this.page.getByRole('button', { name: 'More' }).click();
    }

    await settingsLink.click();

    return new SettingsPage(this.page);
  }

  async createAccount(data) {
    await this.page.getByRole('button', { name: 'Add account' }).click();
    await this.page
      .getByRole('button', { name: 'Create local account' })
      .click();

    // Fill the form
    await this.page.getByLabel('Name:').fill(data.name);
    await this.page.getByLabel('Balance:').fill(String(data.balance));

    if (data.offBudget) {
      await this.page.getByLabel('Off-budget').click();
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

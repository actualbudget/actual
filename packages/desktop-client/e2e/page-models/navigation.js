import { AccountPage } from './account-page';
import { SchedulesPage } from './schedules-page';

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

  async goToSchedulesPage() {
    await this.page.getByRole('link', { name: 'Schedules' }).click();

    return new SchedulesPage(this.page);
  }

  async createAccount(data) {
    await this.page.getByRole('button', { name: 'Add account' }).click();

    // Fill the form
    await this.page.getByLabel('Name:').fill(data.name);
    await this.page.getByLabel('Type:').selectOption({ label: data.type });
    await this.page.getByLabel('Balance:').fill(String(data.balance));

    if (data.offBudget) {
      await this.page.getByLabel('Off-budget').click();
    }

    await this.page.getByRole('button', { name: 'Create' }).click();
    return new AccountPage(this.page);
  }
}

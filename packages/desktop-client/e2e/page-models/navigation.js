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
}

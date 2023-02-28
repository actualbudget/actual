import { AccountPage } from './account-page';

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
}

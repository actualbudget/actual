import { MobileAccountPage } from './mobile-account-page';

export class MobileAccountsPage {
  constructor(page) {
    this.page = page;

    this.accounts = this.page.getByTestId('account');
  }

  /**
   * Get the name and balance of the nth account
   */
  async getNthAccount(idx) {
    const accountRow = this.accounts.nth(idx);

    return {
      name: await accountRow.getByTestId('account-name').textContent(),
      balance: parseInt(
        await accountRow.getByTestId('account-balance').textContent(),
        10,
      ),
    };
  }

  /**
   * Click on the n-th account to open it up
   */
  async openNthAccount(idx) {
    await this.accounts.nth(idx).getByRole('button').click();

    return new MobileAccountPage(this.page);
  }
}

import { MobileAccountPage } from './mobile-account-page';

export class MobileTransactionEntryPage {
  constructor(page) {
    this.page = page;

    this.header = page.getByRole('heading');
    this.amountField = page.getByTestId('amount-input');
    this.add = page.getByRole('button', { name: 'Add transaction' });
  }

  async fillField(fieldLocator, content) {
    await fieldLocator.click();
    await this.page.locator('css=[role=combobox] input').fill(content);
    await this.page.keyboard.press('Enter');
  }

  async createTransaction() {
    await this.add.click();

    return new MobileAccountPage(this.page);
  }
}

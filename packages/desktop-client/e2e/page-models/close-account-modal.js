export class CloseAccountModal {
  constructor(page, locator) {
    this.page = page;
    this.locator = locator;
  }

  async selectTransferAccount(accountName) {
    await this.locator.getByPlaceholder('Select account...').fill(accountName);
    await this.page.keyboard.press('Enter');
  }

  async closeAccount() {
    await this.locator.getByRole('button', { name: 'Close account' }).click();
  }
}

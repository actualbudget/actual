export class CloseAccountModal {
  constructor(page) {
    this.page = page;
  }

  async selectTransferAccount(accountName) {
    await this.page.getByPlaceholder('Select account...').fill(accountName);
    await this.page.keyboard.press('Enter');
  }

  async closeAccount() {
    await this.page.getByRole('button', { name: 'Close account' }).click();
  }
}

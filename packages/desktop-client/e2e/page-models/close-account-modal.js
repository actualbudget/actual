export class CloseAccountModal {
  constructor(page, rootPage) {
    this.page = page;
    this.rootPage = rootPage;
  }

  async selectTransferAccount(accountName) {
    await this.page.getByPlaceholder('Select account...').fill(accountName);
    await this.rootPage.keyboard.press('Enter');
  }

  async closeAccount() {
    await this.page.getByRole('button', { name: 'Close account' }).click();
  }
}

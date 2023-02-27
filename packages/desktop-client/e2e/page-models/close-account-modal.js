export class CloseAccountModal {
  constructor(page) {
    this.page = page;
  }

  async selectTransferAccount(accountName) {
    await this.page.getByRole('combobox').selectOption({ label: accountName });
  }

  async closeAccount() {
    await this.page.getByRole('button', { name: 'Close account' }).click();
  }
}

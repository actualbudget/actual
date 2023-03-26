export class SettingsPage {
  constructor(page) {
    this.page = page;
  }

  async exportData() {
    await this.page.getByRole('button', { name: 'Export data' }).click();
  }
}

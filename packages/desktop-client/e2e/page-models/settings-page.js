export class SettingsPage {
  constructor(page) {
    this.page = page;
  }

  async exportData() {
    await this.page.getByRole('button', { name: 'Export data' }).click();
  }

  async enableExperimentalFeature(featureName) {
    await this.page.getByTestId('advanced-settings').click();
    await this.page.getByTestId('experimental-settings').click();
    await this.page.getByLabel(featureName).check();
  }
}

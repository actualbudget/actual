export class ConfigurationPage {
  constructor(page) {
    this.page = page;
  }

  async createTestFile() {
    await this.page.getByRole('button', { name: 'Create test file' }).click();
    await this.page.getByRole('button', { name: 'Close' }).click();
  }
}

export class MobileReportsPage {
  constructor(page) {
    this.page = page;

    this.overview = page.getByTestId('reports-overview');
  }

  async waitFor(options) {
    await this.overview.waitFor(options);
  }
}

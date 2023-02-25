export class ReportsPage {
  constructor(page) {
    this.page = page;
    this.pageContent = page.getByTestId('reports-page');
  }

  async getAvailableReportList() {
    return await this.pageContent
      .getByRole('link')
      .getByRole('heading')
      .allTextContents();
  }
}

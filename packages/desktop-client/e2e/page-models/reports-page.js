export class ReportsPage {
  constructor(page) {
    this.page = page;
    this.pageContent = page.getByTestId('reports-page');
  }

  async waitToLoad() {
    return this.pageContent.getByRole('link', { name: /^Net/ }).waitFor();
  }

  async getAvailableReportList() {
    return this.pageContent
      .getByRole('link')
      .getByRole('heading')
      .allTextContents();
  }
}

export class ReportsPage {
  constructor(page) {
    this.page = page;
    this.pageContent = page.getByTestId('reports-page');
  }

  async waitToLoad() {
    return this.pageContent.getByRole('link', { name: /^Net/ }).waitFor();
  }

  async goToNetWorthPage() {
    await this.pageContent.getByRole('link', { name: /^Net/ }).click();
    return new ReportsPage(this.page);
  }

  async goToCashFlowPage() {
    await this.pageContent.getByRole('link', { name: /^Cash/ }).click();
    return new ReportsPage(this.page);
  }

  async getAvailableReportList() {
    return this.pageContent
      .getByRole('link')
      .getByRole('heading')
      .allTextContents();
  }
}

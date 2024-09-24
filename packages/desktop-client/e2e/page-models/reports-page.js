import { CustomReportPage } from './custom-report-page';

export class ReportsPage {
  constructor(page) {
    this.page = page;
    this.pageContent = page.getByTestId('reports-page');
  }

  async waitToLoad() {
    return this.pageContent.getByRole('button', { name: /^Net/ }).waitFor();
  }

  async goToNetWorthPage() {
    await this.pageContent.getByRole('button', { name: /^Net/ }).click();
    return new ReportsPage(this.page);
  }

  async goToCashFlowPage() {
    await this.pageContent.getByRole('button', { name: /^Cash/ }).click();
    return new ReportsPage(this.page);
  }

  async goToCustomReportPage() {
    await this.pageContent
      .getByRole('button', { name: 'Create new custom report' })
      .click();
    return new CustomReportPage(this.page);
  }

  async getAvailableReportList() {
    return this.pageContent
      .getByRole('button')
      .getByRole('heading')
      .allTextContents();
  }
}

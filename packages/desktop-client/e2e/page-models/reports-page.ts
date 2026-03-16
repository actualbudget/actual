import type { Locator, Page } from '@playwright/test';

import { CustomReportPage } from './custom-report-page';

export class ReportsPage {
  readonly page: Page;
  readonly pageContent: Locator;

  constructor(page: Page) {
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
      .getByRole('button', { name: 'Add new widget' })
      .click();
    await this.page.getByRole('button', { name: 'New custom report' }).click();
    return new CustomReportPage(this.page);
  }

  async getAvailableReportList() {
    return this.pageContent
      .getByRole('button')
      .getByRole('heading')
      .allTextContents();
  }
}

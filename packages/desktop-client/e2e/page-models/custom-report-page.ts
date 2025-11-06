import { type Locator, type Page } from '@playwright/test';

export class CustomReportPage {
  readonly page: Page;
  readonly pageContent: Locator;
  readonly showLegendButton: Locator;
  readonly showSummaryButton: Locator;
  readonly showLabelsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContent = page.getByTestId('reports-page');

    this.showLegendButton = this.pageContent.getByRole('button', {
      name: 'Show Legend',
    });
    this.showSummaryButton = this.pageContent.getByRole('button', {
      name: 'Show Summary',
    });
    this.showLabelsButton = this.pageContent.getByRole('button', {
      name: 'Show Labels',
    });
  }

  async selectViz(vizName: string | RegExp) {
    await this.pageContent.getByRole('button', { name: vizName }).click();
  }

  async selectMode(mode: 'total' | 'time') {
    switch (mode) {
      case 'total':
        await this.pageContent
          .getByRole('button', { name: 'Total', exact: true })
          .click();
        break;
      case 'time':
        await this.pageContent
          .getByRole('button', { name: 'Time', exact: true })
          .click();
        break;
      default:
        throw new Error(`Unrecognized mode: ${mode}`);
    }
  }
}

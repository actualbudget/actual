export class CustomReportPage {
  constructor(page) {
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

  async selectViz(vizName) {
    await this.pageContent.getByRole('button', { name: vizName }).click();
  }

  async selectMode(mode) {
    switch (mode) {
      case 'total':
        await this.pageContent.getByRole('button', { name: 'Total' }).click();
        break;
      case 'time':
        await this.pageContent.getByRole('button', { name: 'Time' }).click();
        break;
      default:
        throw new Error(`Unrecognized mode: ${mode}`);
    }
  }
}

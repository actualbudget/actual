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

  async goToBalanceForecastPage() {
    const gridItems = this.pageContent.locator('.react-grid-item');
    const count = await gridItems.count();

    let targetItem: Locator | null = null;
    for (let i = count - 1; i >= 0; i--) {
      const item = gridItems.nth(i);
      await item.scrollIntoViewIfNeeded();
      const heading = item.getByRole('heading', { name: /^Balance Forecast/i });
      if (await heading.isVisible()) {
        targetItem = item;
        break;
      }
    }

    if (!targetItem) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      const refreshedCount = await gridItems.count();
      for (let i = refreshedCount - 1; i >= 0; i--) {
        const item = gridItems.nth(i);
        await item.scrollIntoViewIfNeeded();
        const heading = item.getByRole('heading', {
          name: /^Balance Forecast/i,
        });
        if (await heading.isVisible()) {
          targetItem = item;
          break;
        }
      }
    }

    if (!targetItem) {
      throw new Error('No Balance Forecast dashboard card found in the grid');
    }

    const cardNavigateButton = targetItem.getByRole('button', {
      name: /^Balance Forecast/i,
    });
    await Promise.all([
      this.page.waitForURL(/\/reports\/forecast\//),
      cardNavigateButton.click(),
    ]);

    await this.pageContent
      .getByRole('button', { name: 'Monthly' })
      .waitFor({ state: 'visible' });

    return new ReportsPage(this.page);
  }

  async selectForecastGranularity(granularity: string) {
    await this.pageContent.getByRole('button', { name: 'Monthly' }).click();
    const option = this.page.getByRole('button', { name: granularity });
    await option.waitFor({ state: 'visible' });
    await option.click();
    await this.pageContent
      .getByRole('button', { name: granularity })
      .waitFor({ state: 'visible' });
  }

  async selectForecastSource(
    source: 'Scheduled transactions' | 'Tracking budget',
  ) {
    await this.pageContent
      .getByRole('button', {
        name: /^(Scheduled transactions|Tracking budget)$/,
      })
      .click();
    const option = this.page.getByRole('button', { name: source });
    await option.waitFor({ state: 'visible' });
    await option.click();
    await this.pageContent
      .getByRole('button', { name: source })
      .waitFor({ state: 'visible' });
  }

  async addWidget(widgetName: string) {
    await this.pageContent
      .getByRole('button', { name: 'Add new widget' })
      .click();
    await this.page.getByRole('button', { name: widgetName }).click();
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

  async rightClickReportCard(title: string | RegExp) {
    await this.pageContent
      .getByRole('button', { name: title })
      .click({ button: 'right' });
  }
}


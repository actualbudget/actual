import { expect } from '@playwright/test';
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
    await this.pageContent.locator('.react-grid-item').first().waitFor();
  }

  async goToNetWorthPage() {
    await (await this.scrollDashboardCardIntoView(/^Net Worth$/)).click();
    return new ReportsPage(this.page);
  }

  async goToCashFlowPage() {
    await (await this.scrollDashboardCardIntoView(/^Cash Flow$/)).click();
    return new ReportsPage(this.page);
  }

  async goToCalendarPage() {
    const card = await this.scrollDashboardCardIntoView(
      /^(Transaction )?Calendar$/,
    );

    await Promise.all([
      this.page.waitForURL(/\/reports\/calendar\/.+/),
      card.click(),
    ]);

    return new ReportsPage(this.page);
  }

  /**
   * Locates the dashboard card whose title matches `name` and scrolls it into
   * view, returning its clickable button.
   *
   * `ReportCard` renders its children only once the card enters the viewport,
   * so an off-screen card has no title to match on — and a card added during
   * the test may not be in the DOM yet at all.
   *
   * The dashboard scrolls inside `Page`'s own `overflowY: auto` container
   * rather than the document, so scrolling the window is a no-op here. Walk
   * the grid items instead and bring each into view until the card renders;
   * `ReportCard` latches `hasRendered`, so a card stays rendered once seen.
   */
  async scrollDashboardCardIntoView(name: string | RegExp) {
    const card = this.pageContent
      .getByRole('button')
      .filter({ has: this.page.getByRole('heading', { name }) });

    await expect(async () => {
      const gridItems = this.pageContent.locator('.react-grid-item');
      const count = await gridItems.count();

      for (let i = count - 1; i >= 0; i--) {
        await gridItems.nth(i).scrollIntoViewIfNeeded();

        if (await card.isVisible()) {
          break;
        }
      }

      await expect(card).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20_000 });

    return card;
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

  async selectYAxisBase(yAxisBase: string) {
    await this.pageContent.getByRole('button', { name: 'Auto' }).click();
    const option = this.page.getByRole('button', { name: yAxisBase });
    await option.waitFor({ state: 'visible' });
    await option.click();
    await this.pageContent
      .getByRole('button', { name: yAxisBase })
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

  /**
   * Opens the "Add new widget" menu, which is only available while editing
   * the dashboard.
   */
  async openAddWidgetMenu() {
    const editButton = this.pageContent.getByRole('button', {
      name: 'Edit dashboard',
    });
    if (await editButton.isVisible()) {
      await editButton.click();
    }
    await this.pageContent
      .getByRole('button', { name: 'Add new widget' })
      .click();
  }

  async finishEditing() {
    const finishButton = this.pageContent.getByRole('button', {
      name: 'Finish editing dashboard',
    });
    if (await finishButton.isVisible()) {
      await finishButton.click();
    }
  }

  async addWidget(widgetName: string) {
    await this.openAddWidgetMenu();
    await this.page.getByRole('button', { name: widgetName }).click();
    await this.finishEditing();
  }

  async goToCustomReportPage() {
    await this.openAddWidgetMenu();
    await this.page.getByRole('button', { name: 'New custom report' }).click();
    return new CustomReportPage(this.page);
  }

  async getAvailableReportList() {
    const gridItems = this.pageContent.locator('.react-grid-item');
    for (let i = 0; i < (await gridItems.count()); i++) {
      await gridItems.nth(i).scrollIntoViewIfNeeded();
      await expect(gridItems.nth(i).getByRole('heading')).toBeVisible();
    }
    await gridItems.first().scrollIntoViewIfNeeded();
    return this.pageContent
      .getByRole('button')
      .getByRole('heading')
      .allTextContents();
  }

  async rightClickReportCard(title: string | RegExp) {
    await (
      await this.scrollDashboardCardIntoView(title)
    ).click({ button: 'right' });
  }
}

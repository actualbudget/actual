import type { Locator, Page } from '@playwright/test';

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

  async selectSplit(splitName: string) {
    await this.pageContent
      .getByRole('button', { name: 'Category', exact: true })
      .first()
      .click();
    await this.page
      .getByRole('button', { name: splitName, exact: true })
      .click();
  }

  donutSector(index: number) {
    return this.pageContent.locator('.recharts-pie-sector').nth(index);
  }

  // Present while the sector is selected
  donutSectorSelection(index: number) {
    return this.donutSector(index).locator('[data-donut-selected]');
  }

  // A point inside the sector. The centre of its bounding box can be in the
  // donut's hole or in another sector, so the chart is sampled for points
  // that hit this sector.
  async pointInDonutSector(index: number) {
    const sector = this.donutSector(index);
    await sector.waitFor();
    return sector.evaluate(layer => {
      // The sector's own shape, not its highlight or label
      const target = layer.querySelector('path');
      const svg = layer.closest('svg');
      if (!target || !svg) {
        throw new Error('Donut sector has no shape');
      }
      const box = svg.getBoundingClientRect();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const hits: { x: number; y: number; r: number }[] = [];
      for (let r = 4; r < Math.min(box.width, box.height) / 2; r += 2) {
        for (let deg = 0; deg < 360; deg += 1) {
          const angle = (deg * Math.PI) / 180;
          const x = cx + r * Math.sin(angle);
          const y = cy - r * Math.cos(angle);
          if (document.elementFromPoint(x, y) === target) {
            hits.push({ x, y, r });
          }
        }
      }
      if (hits.length === 0) {
        throw new Error('Donut sector is not visible');
      }
      // The middle hit on the sector's middle radius, away from its edges
      const midRadius = hits[Math.floor(hits.length / 2)].r;
      const ring = hits.filter(hit => hit.r === midRadius);
      const { x, y } = ring[Math.floor(ring.length / 2)];
      return { x, y };
    });
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
        throw new Error(`Unrecognized mode: ${String(mode)}`);
    }
  }
}

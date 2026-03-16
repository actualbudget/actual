import type { Locator, Page } from '@playwright/test';

export class SankeyPage {
  readonly page: Page;
  readonly pageContent: Locator;
  readonly budgetedButton: Locator;
  readonly spentButton: Locator;
  readonly monthSelect: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContent = page.getByTestId('reports-page');

    this.spentButton = this.pageContent.getByRole('button', {
      name: 'Spent',
    });
    this.budgetedButton = this.pageContent.getByRole('button', {
      name: 'Budgeted',
    });
    this.saveButton = this.pageContent.getByRole('button', {
      name: 'Save',
    });
    // The month select is a generic select element
    this.monthSelect = this.pageContent.locator('select').first();
  }

  async waitToLoad() {
    await this.pageContent.waitFor();
  }

  async selectMode(mode: 'budgeted' | 'spent' | 'difference') {
    switch (mode) {
      case 'spent':
        await this.spentButton.click();
        break;
      case 'budgeted':
        await this.budgetedButton.click();
        break;
      default:
        throw new Error(`Unrecognized mode: ${mode}`);
    }
    // Wait for graph to update
    await this.page.waitForTimeout(500);
  }

  async selectMonth(monthValue: string) {
    await this.monthSelect.selectOption(monthValue);
    // Wait for graph to update
    await this.page.waitForTimeout(500);
  }
}

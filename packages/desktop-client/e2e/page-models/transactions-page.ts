import { join } from 'path';

import type { Page } from '@playwright/test';

// oxlint-disable-next-line typescript-paths/absolute-parent-import -- Playwright resolves e2e relative imports; monorepo absolute path is not in the test runner module graph
import { expect } from '../fixtures';

const defaultTransactionsCsvPath = join(__dirname, '../data/test.csv');

/**
 * Import flow helpers for the account transactions view (CSV import, dialogs).
 */
export class TransactionsPageModel {
  constructor(readonly page: Page) {}

  async openImportPreview(absoluteCsvPath: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.getByRole('button', { name: 'Import' }).click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(absoluteCsvPath);

    const importButton = this.page.getByRole('button', {
      name: /Import \d+ transactions/,
    });

    await importButton.waitFor({ state: 'visible' });
    return importButton;
  }

  async importCsv(screenshot = false, csvPath = defaultTransactionsCsvPath) {
    const importButton = await this.openImportPreview(csvPath);

    if (screenshot) await expect(this.page).toMatchThemeScreenshots();

    await importButton.click();

    await expect(importButton).not.toBeVisible();
  }

  getImportCategoriesDialog() {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: 'Import Categories' }),
    });
  }

  /** Topmost dialog in the stack (last in DOM); avoids flaky full-page captures when modals overlap. */
  getTopDialog() {
    return this.page.getByRole('dialog').last();
  }
}

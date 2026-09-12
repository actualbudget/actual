import type { Locator, Page } from '@playwright/test';

/**
 * The experimental Transaction Changes screen, behind the `changeLog` flag.
 *
 * Wide screens only -- the route redirects on narrow widths -- so there is
 * deliberately no mobile counterpart to this model.
 */
export class TransactionChangesPage {
  readonly page: Page;
  /**
   * The wide `PageHeader` renders plain text rather than a heading role, so
   * the screen is identified by its own filter box instead.
   */
  readonly filterBox: Locator;
  readonly description: Locator;
  /** Shown when the budget was opened before the flag was turned on. */
  readonly notRecordingNotice: Locator;
  readonly emptyState: Locator;
  readonly noMatchState: Locator;
  /** Scoped to the list so the table header's own row does not match. */
  readonly entryRow: Locator;

  constructor(page: Page) {
    this.page = page;

    this.filterBox = page.getByPlaceholder('Filter loaded changes...');
    this.description = page.getByText('Every change made to a transaction');
    this.notRecordingNotice = page.getByText(
      'Change history is not being recorded',
    );
    this.emptyState = page.getByText('No changes recorded yet');
    this.noMatchState = page.getByText('No changes match this filter');
    this.entryRow = page.getByTestId('change-log').getByTestId('row');
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.filterBox.waitFor(...options);
  }

  /**
   * Retrieve the cells of the nth entry, newest first.
   *
   * Each entry is a single row. A cell whose value changed holds an
   * `old -> new` pair, addressable through `oldValue`/`newValue`; every other
   * cell holds a plain value. 0-based index.
   */
  getNthEntry(index: number) {
    const row = this.entryRow.nth(index);

    return {
      row,
      when: row.getByTestId('when'),
      changeType: row.getByTestId('change-type'),
      device: row.getByTestId('device'),
      /** The added/edited/deleted/restored tag, in the "Change type" cell. */
      badge: row.getByTestId('change-log-badge'),
      cell: (column: string) => row.getByTestId(column),
      oldValue: (column: string) =>
        row.getByTestId(column).getByTestId('change-log-old'),
      newValue: (column: string) =>
        row.getByTestId(column).getByTestId('change-log-new'),
    };
  }

  async filterFor(text: string) {
    await this.filterBox.fill(text);
  }
}

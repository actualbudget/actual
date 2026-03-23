import type { Locator, Page } from '@playwright/test';

const NO_SCHEDULES_FOUND_TEXT =
  'No schedules found. Create your first schedule to get started!';

export class MobileSchedulesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly addButton: Locator;
  readonly schedulesList: Locator;
  readonly noSchedulesFoundText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter schedules…');
    this.addButton = page.getByRole('button', { name: 'Add new schedule' });
    this.schedulesList = page.getByRole('grid', { name: 'Schedules' });
    this.noSchedulesFoundText = this.schedulesList.getByText(
      NO_SCHEDULES_FOUND_TEXT,
    );
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.schedulesList.waitFor(options);
  }

  /**
   * Search for schedules using the search box
   */
  async searchFor(text: string) {
    await this.searchBox.fill(text);
  }

  /**
   * Clear the search box
   */
  async clearSearch() {
    await this.searchBox.fill('');
  }

  /**
   * Get the nth schedule item (0-based index)
   */
  getNthSchedule(index: number) {
    return this.getAllSchedules().nth(index);
  }

  /**
   * Get all visible schedule items
   */
  getAllSchedules() {
    // `GridList.renderEmptyState` still renders a row with "No schedules found" text
    // when no schedules are present, so we need to filter that out to get the actual schedule items.
    return this.schedulesList
      .getByRole('row')
      .filter({ hasNotText: NO_SCHEDULES_FOUND_TEXT });
  }

  /**
   * Click on a schedule to open the edit page
   */
  async clickSchedule(index: number) {
    const schedule = this.getNthSchedule(index);
    await schedule.click();
  }

  /**
   * Click the add button to create a new schedule
   */
  async clickAddSchedule() {
    await this.addButton.click();
  }

  /**
   * Get the number of visible schedules
   */
  async getScheduleCount() {
    const schedules = this.getAllSchedules();
    return await schedules.count();
  }
}

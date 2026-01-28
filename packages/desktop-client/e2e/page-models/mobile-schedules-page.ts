import type { Locator, Page } from '@playwright/test';

export class MobileSchedulesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly addButton: Locator;
  readonly schedulesList: Locator;
  readonly emptyMessage: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter schedules…');
    this.addButton = page.getByRole('button', { name: 'Add new schedule' });
    this.schedulesList = page.getByRole('grid', { name: 'Schedules' });
    this.emptyMessage = page.getByText(
      'No schedules found. Create your first schedule to get started!',
    );
    this.loadingIndicator = page.getByTestId('animated-loading');
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
    return this.schedulesList.getByRole('gridcell');
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

  /**
   * Wait for loading to complete
   */
  async waitForLoadingToComplete(timeout: number = 10000) {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout });
  }
}

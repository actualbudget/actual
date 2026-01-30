import type { Locator, Page } from '@playwright/test';

import { ScheduleEditModal } from './schedule-edit-modal';

export class SchedulesPage {
  readonly page: Page;
  readonly addNewScheduleButton: Locator;
  readonly schedulesTableRow: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addNewScheduleButton = this.page.getByRole('button', {
      name: 'Add new schedule',
    });
    this.schedulesTableRow = this.page.getByTestId('table').getByTestId('row');
  }

  /**
   * Open the schedule edit modal.
   */
  async addNewSchedule() {
    await this.addNewScheduleButton.click();

    return new ScheduleEditModal(this.page.getByTestId('schedule-edit-modal'));
  }

  /**
   * Retrieve the row element for the nth-schedule.
   * 0-based index
   */
  getNthScheduleRow(index: number) {
    return this.schedulesTableRow.nth(index);
  }

  /**
   * Retrieve the data for the nth-schedule.
   * 0-based index
   */
  getNthSchedule(index: number) {
    const row = this.getNthScheduleRow(index);

    return {
      payee: row.getByTestId('payee'),
      account: row.getByTestId('account'),
      date: row.getByTestId('date'),
      status: row.getByTestId('status'),
      amount: row.getByTestId('amount'),
    };
  }

  /**
   * Create a transaction for the nth-schedule.
   * 0-based index
   */
  async postNthSchedule(index: number) {
    await this._performNthAction(index, 'Post transaction today');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Complete the nth-schedule.
   * 0-based index
   */
  async completeNthSchedule(index: number) {
    await this._performNthAction(index, 'Complete');
    await this.page.waitForTimeout(1000);
  }

  async _performNthAction(index: number, actionName: string | RegExp) {
    const row = this.getNthScheduleRow(index);
    const actions = row.getByTestId('actions');

    await actions.getByRole('button').click();
    await this.page.getByRole('button', { name: actionName }).click();
  }
}

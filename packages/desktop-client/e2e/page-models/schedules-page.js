export class SchedulesPage {
  constructor(page) {
    this.page = page;

    this.addNewScheduleButton = this.page.getByRole('button', {
      name: 'Add new schedule',
    });
    this.schedulesTableRow = this.page.getByTestId('table').getByTestId('row');
  }

  /**
   * Add a new schedule
   */
  async addNewSchedule(data) {
    await this.addNewScheduleButton.click();

    await this._fillScheduleFields(data);

    await this.page.getByRole('button', { name: 'Add' }).click();
  }

  /**
   * Retrieve the row element for the nth-schedule.
   * 0-based index
   */
  getNthScheduleRow(index) {
    return this.schedulesTableRow.nth(index);
  }

  /**
   * Retrieve the data for the nth-schedule.
   * 0-based index
   */
  getNthSchedule(index) {
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
  async postNthSchedule(index) {
    await this._performNthAction(index, 'Post transaction');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Complete the nth-schedule.
   * 0-based index
   */
  async completeNthSchedule(index) {
    await this._performNthAction(index, 'Complete');
    await this.page.waitForTimeout(1000);
  }

  async _performNthAction(index, actionName) {
    const row = this.getNthScheduleRow(index);
    const actions = row.getByTestId('actions');

    await actions.getByRole('button').click();
    await this.page.getByRole('button', { name: actionName }).click();
  }

  async _fillScheduleFields(data) {
    if (data.payee) {
      await this.page.getByRole('textbox', { name: 'Payee' }).fill(data.payee);
      await this.page.keyboard.press('Enter');
    }

    if (data.account) {
      await this.page
        .getByRole('textbox', { name: 'Account' })
        .fill(data.account);
      await this.page.keyboard.press('Enter');
    }

    if (data.amount) {
      await this.page.getByLabel('Amount').fill(String(data.amount));
    }
  }
}

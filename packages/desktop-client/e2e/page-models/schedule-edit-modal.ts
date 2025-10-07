import { type Locator, type Page } from '@playwright/test';

type ScheduleEntry = {
  payee?: string;
  account?: string;
  amount?: number;
};

export class ScheduleEditModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly scheduleNameField: Locator;
  readonly payeeField: Locator;
  readonly accountField: Locator;
  readonly amountField: Locator;
  readonly addButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.scheduleNameField = locator.getByRole('textbox', {
      name: 'Schedule Name',
    });
    this.payeeField = locator.getByRole('textbox', { name: 'Payee' });
    this.accountField = locator.getByRole('textbox', { name: 'Account' });
    this.amountField = locator.getByLabel('Amount');
    this.addButton = locator.getByRole('button', { name: 'Add' });
  }

  async fill(data: ScheduleEntry) {
    if (data.payee) {
      await this.payeeField.fill(data.payee);
      await this.page.keyboard.press('Enter');
    }

    if (data.account) {
      await this.accountField.fill(data.account);
      await this.page.keyboard.press('Enter');
    }

    if (data.amount) {
      await this.amountField.fill(String(data.amount));
      // For some readon, the input field does not trigger the change event on tests
      // but it works on the browser. We can revisit this once migration to
      // react aria components is complete.
      await this.page.keyboard.press('Enter');
    }
  }

  async add() {
    await this.addButton.click();
  }

  async close() {
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }
}

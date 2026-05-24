import type { Locator, Page } from '@playwright/test';

import { AccountPage } from './account-page';
import { BankSyncPage } from './bank-sync-page';
import { PayeesPage } from './payees-page';
import { ReportsPage } from './reports-page';
import { RulesPage } from './rules-page';
import { SchedulesPage } from './schedules-page';
import { SettingsPage } from './settings-page';

type AccountEntry = {
  name: string;
  balance: number;
  offBudget: boolean;
};

/**
 * Click a React Aria <Button> via a programmatic browser-side click.
 *
 * React Aria components re-render on focus state changes (`data-focused`,
 * `data-focus-visible`). Under parallel CI load, Playwright's `.click()`
 * stability check often sees the DOM node get detached and re-mounted
 * mid-action, leading to "element was detached from the DOM, retrying"
 * loops that exhaust the test timeout.
 *
 * `dispatchEvent('click')` is documented to skip stability checks but
 * dispatches a generic `Event` that React Aria's pointer-based onPress
 * does not respond to, so it doesn't actually activate the button.
 *
 * Calling `.click()` inside `page.evaluate` runs synchronously in the
 * browser: querySelector + click happen in one JS task with no CDP
 * roundtrip in between, so React has no chance to re-render between
 * resolution and click. HTMLElement.click() dispatches a real MouseEvent
 * that React Aria handles correctly.
 */
async function clickReactAriaButton(locator: Locator): Promise<void> {
  await locator.evaluate((el: HTMLElement) => el.click());
}

/**
 * Fill a React-controlled input via the native value setter + input event.
 *
 * React's controlled inputs respond to `input` events to update state.
 * Playwright's `.fill()` clears + types, dispatching multiple events that
 * each cause React Aria's input wrappers to re-render. Under load this
 * loops indefinitely as `.fill()`'s editability check keeps seeing
 * detached nodes.
 *
 * The native value setter pattern (https://stackoverflow.com/q/23892547)
 * sets the value once and dispatches a single input event. React
 * processes one state update and one re-render, then the input is stable.
 */
async function fillReactInput(locator: Locator, value: string): Promise<void> {
  await locator.evaluate((el, val) => {
    const input = el as HTMLInputElement;
    // oxlint-disable-next-line typescript/unbound-method -- documented React-controlled-input pattern
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

export class Navigation {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goToAccountPage(accountName: string) {
    await this.page
      .getByRole('link', { name: new RegExp(`^${accountName}`) })
      .click();

    return new AccountPage(this.page);
  }

  async goToReportsPage() {
    await this.page.getByRole('link', { name: 'Reports' }).click();

    return new ReportsPage(this.page);
  }

  async goToSchedulesPage() {
    await this.page.getByRole('link', { name: 'Schedules' }).click();

    return new SchedulesPage(this.page);
  }

  async goToRulesPage() {
    const rulesLink = this.page.getByRole('link', { name: 'Rules' });

    // Expand the "more" menu only if it is not already expanded
    if (!(await rulesLink.isVisible())) {
      await this.page.getByRole('button', { name: 'More' }).click();
    }

    await rulesLink.click();

    return new RulesPage(this.page);
  }

  async goToPayeesPage() {
    const payeesLink = this.page.getByRole('link', { name: 'Payees' });

    // Expand the "More" menu only if the Payees link is not visible
    if (!(await payeesLink.isVisible())) {
      await this.page.getByRole('button', { name: 'More' }).click();
    }

    await payeesLink.click();

    return new PayeesPage(this.page);
  }

  async goToBankSyncPage() {
    const bankSyncLink = this.page.getByRole('link', { name: 'Bank Sync' });

    // Expand the "more" menu only if it is not already expanded
    if (!(await bankSyncLink.isVisible())) {
      await this.page.getByRole('button', { name: 'More' }).click();
    }

    await bankSyncLink.click();

    return new BankSyncPage(this.page);
  }

  async goToSettingsPage() {
    const settingsLink = this.page.getByRole('link', { name: 'Settings' });

    // Expand the "more" menu only if it is not already expanded
    if (!(await settingsLink.isVisible())) {
      await this.page.getByRole('button', { name: 'More' }).click();
    }

    await settingsLink.click();

    return new SettingsPage(this.page);
  }

  async createAccount(data: AccountEntry) {
    await this.page.getByRole('button', { name: 'Add account' }).click();

    // Clicking "Create a local account" pushes a second modal whose
    // heading is "Create Local Account". Wait for that heading to
    // confirm the form is fully mounted before touching any fields.
    await clickReactAriaButton(
      this.page.getByRole('button', { name: 'Create a local account' }),
    );
    await this.page
      .getByRole('heading', { name: 'Create Local Account' })
      .waitFor({ state: 'visible' });

    await fillReactInput(this.page.getByLabel('Name'), data.name);
    await fillReactInput(this.page.getByLabel('Balance'), String(data.balance));

    if (data.offBudget) {
      await this.page.getByLabel('Off budget').click();
    }

    await clickReactAriaButton(
      this.page.getByRole('button', { name: 'Create', exact: true }),
    );

    const accountPage = new AccountPage(this.page);
    await accountPage.waitFor();
    if (data.balance !== 0) {
      await accountPage.transactionTableRow.first().waitFor();
    }
    return accountPage;
  }

  async clickOnNoServer() {
    await this.page.getByRole('button', { name: 'No server' }).click();
  }
}

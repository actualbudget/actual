import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './base-page';
import { clickReactAriaButton, fillReactInput } from '../utils/react-helpers';

/**
 * BudgetPage represents the main `/budget` view and its sidebar.
 *
 * Responsibilities:
 * - Navigate to the budget page
 * - Create local accounts via the sidebar "Add account" flow
 * - Navigate to individual accounts
 * - Read sidebar balance totals
 *
 * Assertions belong in spec files — this class only encapsulates user actions.
 */
export class BudgetPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/budget');
    await this.waitForNetworkIdle();
  }

  // ─── Sidebar locators ───────────────────────────────────────────────────────

  get addAccountButton(): Locator {
    return this.getByRole('button', { name: 'Add account' });
  }

  get sidebarAllAccountsBalance(): Locator {
    return this.getByTestId('sidebar-all-accounts-balance');
  }

  get sidebarOnBudgetBalance(): Locator {
    return this.getByTestId('sidebar-on-budget-balance');
  }

  get sidebarOffBudgetBalance(): Locator {
    return this.getByTestId('sidebar-off-budget-balance');
  }

  // ─── Account creation ───────────────────────────────────────────────────────

  /**
   * Opens the "Add account" modal by clicking the sidebar button.
   */
  async openAddAccountModal(): Promise<void> {
    await this.addAccountButton.click();
  }

  /**
   * Creates a local (on-budget) account with an initial balance.
   * Waits until the account link appears in the sidebar before returning.
   *
   * @param name    Account display name — use a unique timestamp-based name from
   *                `generateAccountData()` to prevent collisions in parallel runs.
   * @param balance Initial balance in dollars (e.g. 500 → "$500.00").
   */
  async createLocalAccount(name: string, balance: number): Promise<void> {
    await this.openAddAccountModal();

    await clickReactAriaButton(this.getByRole('button', { name: 'Create a local account' }));
    await fillReactInput(this.getByLabel('Name'), name);
    await fillReactInput(this.getByLabel('Balance'), String(balance));
    await clickReactAriaButton(this.getByRole('button', { name: 'Create', exact: true }));

    // Wait until the sidebar link for this account is rendered
    await this.page
      .getByRole('link', { name: new RegExp(`^${escapeRegExp(name)}`) })
      .waitFor({ state: 'visible' });
  }

  // ─── Navigation helpers ─────────────────────────────────────────────────────

  /**
   * Clicks the account link in the sidebar and waits for the account URL.
   * The link text is matched by prefix to tolerate balance suffixes in the label.
   */
  async navigateToAccount(name: string): Promise<void> {
    await this.page.getByRole('link', { name: new RegExp(`^${escapeRegExp(name)}`) }).click();

    await this.waitForUrl(/\/accounts\//);
  }

  // ─── Budget summary ─────────────────────────────────────────────────────────

  get budgetTable(): Locator {
    return this.getByTestId('budget-table');
  }

  get budgetTotals(): Locator {
    return this.getByTestId('budget-totals');
  }
}

/** Escapes special regex characters in an account name so it can be used in RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

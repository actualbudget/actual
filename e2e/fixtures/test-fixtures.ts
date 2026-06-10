import { test as base, type Page } from '@playwright/test';
import { BudgetPage } from '../pages/budget-page';
import { AccountPage } from '../pages/account-page';
import { TransactionPage } from '../pages/transaction-page';
import { ApiClient } from '../utils/api-client';

// ─── Fixture type declarations ────────────────────────────────────────────────

interface TestFixtures {
  /** BudgetPage instance pre-wired to the current test's page. */
  budgetPage: BudgetPage;
  /** AccountPage instance pre-wired to the current test's page. */
  accountPage: AccountPage;
  /** TransactionPage instance pre-wired to the current test's page. */
  transactionPage: TransactionPage;
  /** ApiClient instance for any available HTTP endpoints. */
  apiClient: ApiClient;
}

// ─── Extended test object ─────────────────────────────────────────────────────

/**
 * `test` is the Playwright test runner extended with project-specific fixtures.
 *
 * Import `test` and `expect` from this file in every spec file instead of
 * importing directly from `@playwright/test`. This keeps all fixture wiring
 * in one place and lets spec files stay lean.
 *
 * The `page` fixture is overridden so that every test automatically starts
 * on the budget page, having gone through the initial app setup if needed.
 * This keeps individual tests free of repetitive navigation boilerplate.
 */
export const test = base.extend<TestFixtures>({
  /**
   * Override `page` to perform app-level setup before each test.
   *
   * The storageState saved by `app.setup.ts` already contains the
   * server-selection choice (localStorage), so the only remaining setup
   * step is selecting the demo budget when the welcome screen appears.
   */
  page: async ({ page }, use) => {
    await navigateToBudget(page);
    await use(page);
  },

  budgetPage: async ({ page }, use) => {
    await use(new BudgetPage(page));
  },

  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },

  transactionPage: async ({ page }, use) => {
    await use(new TransactionPage(page));
  },

  apiClient: async ({ request }, use) => {
    const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
    await use(new ApiClient(request, baseUrl));
  },
});

// Re-export expect so spec files have a single import source
export { expect } from '@playwright/test';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Navigates to the app and handles any setup screens.
 *
 * Setup screen sequence:
 *   1. Server selection (/config-server) → click "Don't use a server".
 *      The app stores this preference in OPFS/SQLite (not localStorage), so
 *      storageState does not skip this screen — every test must click through.
 *   2. Budget selection → click "View demo" to load a pre-populated demo budget.
 *
 * Uses waitFor({ state: 'visible' }) instead of isVisible() because isVisible()
 * is not a wait method — it checks the current DOM state synchronously and
 * returns false before React has finished mounting.
 */
async function navigateToBudget(page: Page): Promise<void> {
  await page.goto('/');

  // Step 1: Server selection screen — wait for React to mount the button.
  // This screen always appears on fresh contexts (storageState doesn't help).
  const noServerButton = page.getByRole('button', { name: /don't use a server/i });
  const noServerAppeared = await noServerButton
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (noServerAppeared) {
    await noServerButton.click();
  }

  // Step 2: Budget selection screen — click "View demo".
  const viewDemoButton = page.getByRole('button', { name: /view demo/i });
  const viewDemoAppeared = await viewDemoButton
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (viewDemoAppeared) {
    await viewDemoButton.click();
  }

  // Wait until we land on the budget or accounts page.
  await page.waitForURL(/\/(budget|accounts)/, { timeout: 30_000 });
}

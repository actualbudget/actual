import { test, expect } from '../fixtures/test-fixtures';
import {
  generateAccountData,
  generateTransactionData,
  computeExpectedBalance,
} from '../fixtures/test-data';
import { clickReactAriaButton, fillReactInput } from '../utils/react-helpers';
import { parseMoney, moneyEquals, roundMoney } from '../utils/money-utils';

/**
 * Core workflow: Create Account → Add Transaction → Verify Balance
 *
 * Each test is fully independent:
 * - Account names embed `Date.now()` so parallel workers never collide.
 * - The demo budget is loaded fresh per test via the `page` fixture.
 * - Cleanup (closeAccount) runs in `afterEach` to keep the budget tidy.
 *
 * All assertions live here, not in page objects.
 */

test.describe('Account → Transaction → Balance', () => {
  // Track the account name so afterEach can clean up even on test failure
  let createdAccountName: string;

  test.afterEach(async ({ accountPage, page }) => {
    // Navigate back to the account if the test failed mid-way
    if (createdAccountName && /\/accounts\//.test(page.url())) {
      await accountPage.closeAccount().catch(() => {
        // Cleanup is best-effort — don't mask the original test failure
      });
    }
  });

  // ─── Scenario 1: Single debit reduces balance ──────────────────────────────

  test('debit transaction reduces the account balance', async ({
    budgetPage,
    accountPage,
    transactionPage,
  }) => {
    const account = generateAccountData({ initialBalance: 500 });
    const transaction = generateTransactionData({ amount: 75, type: 'debit' });
    createdAccountName = account.name;

    // ── Step 1: Create account ────────────────────────────────────────────────
    await budgetPage.goto();
    await budgetPage.createLocalAccount(account.name, account.initialBalance);

    // Verify the account link appeared in the sidebar
    await expect(
      budgetPage.page.getByRole('link', { name: new RegExp(`^${account.name}`) }),
    ).toBeVisible();

    // ── Step 2: Navigate to the account ──────────────────────────────────────
    await budgetPage.navigateToAccount(account.name);

    // The account heading should match the name we chose
    await expect(accountPage.accountName).toHaveText(account.name);

    // Wait for the initial-balance transaction row to confirm the SQLite
    // async fetch has completed before reading the balance text.
    await accountPage.waitForTransactionCount(1);
    const initialBalanceText = await accountPage.getBalanceText();
    expect(moneyEquals(parseMoney(initialBalanceText), account.initialBalance)).toBe(true);

    // ── Step 3: Add a debit transaction ───────────────────────────────────────
    await accountPage.clickAddNewTransaction();
    await transactionPage.fill(transaction);
    await transactionPage.save();

    // ── Step 4: Verify the transaction row appeared ────────────────────────────
    // The table now has 2 rows: the initial-balance row + our new transaction
    await accountPage.waitForTransactionCount(2);
    await expect(accountPage.transactionRows).toHaveCount(2);

    // ── Step 5: Verify the balance decreased by the transaction amount ─────────
    const expectedBalance = computeExpectedBalance(account.initialBalance, [transaction]);
    const newBalanceText = await accountPage.getBalanceText();
    const newBalance = parseMoney(newBalanceText);

    expect(moneyEquals(newBalance, expectedBalance)).toBe(true);
    // More readable failure message on mismatch:
    expect(roundMoney(newBalance)).toBe(roundMoney(expectedBalance));
  });

  // ─── Scenario 2: Credit transaction increases balance ─────────────────────

  test('credit transaction increases the account balance', async ({
    budgetPage,
    accountPage,
    transactionPage,
  }) => {
    const account = generateAccountData({ initialBalance: 200 });
    const transaction = generateTransactionData({ amount: 150, type: 'credit' });
    createdAccountName = account.name;

    await budgetPage.goto();
    await budgetPage.createLocalAccount(account.name, account.initialBalance);
    await budgetPage.navigateToAccount(account.name);

    await accountPage.clickAddNewTransaction();
    await transactionPage.fill(transaction);
    await transactionPage.save();

    await accountPage.waitForTransactionCount(2);

    const expected = computeExpectedBalance(account.initialBalance, [transaction]);
    const actual = parseMoney(await accountPage.getBalanceText());

    expect(roundMoney(actual)).toBe(roundMoney(expected));
  });

  // ─── Scenario 3: Multiple transactions accumulate correctly ───────────────

  test('multiple transactions reflect the correct running balance', async ({
    budgetPage,
    accountPage,
    transactionPage,
  }) => {
    const account = generateAccountData({ initialBalance: 1000 });
    const transactions = [
      generateTransactionData({ amount: 200, type: 'debit' }),
      generateTransactionData({ amount: 50, type: 'credit' }),
      generateTransactionData({ amount: 100, type: 'debit' }),
    ];
    createdAccountName = account.name;

    await budgetPage.goto();
    await budgetPage.createLocalAccount(account.name, account.initialBalance);
    await budgetPage.navigateToAccount(account.name);

    // Add all three transactions sequentially
    for (const tx of transactions) {
      await accountPage.clickAddNewTransaction();
      await transactionPage.fill(tx);
      await transactionPage.save();
    }

    // Table should now have 4 rows: 1 initial-balance + 3 we added
    await accountPage.waitForTransactionCount(4);
    await expect(accountPage.transactionRows).toHaveCount(4);

    const expected = computeExpectedBalance(account.initialBalance, transactions);
    const actual = parseMoney(await accountPage.getBalanceText());

    expect(roundMoney(actual)).toBe(roundMoney(expected));
  });

  // ─── Scenario 4: Off-budget account balance ────────────────────────────────

  test('off-budget account tracks balance independently from budget', async ({
    budgetPage,
    accountPage,
    transactionPage,
  }) => {
    const account = generateAccountData({
      name: `Off-Budget ${Date.now()}`,
      initialBalance: 3000,
      offBudget: true,
    });
    const transaction = generateTransactionData({ amount: 500, type: 'debit' });
    createdAccountName = account.name;

    await budgetPage.goto();

    // Create as off-budget — the UI has an "Off budget" toggle in the modal
    await budgetPage.openAddAccountModal();
    await clickReactAriaButton(budgetPage.page.getByRole('button', { name: 'Create a local account' }));
    await fillReactInput(budgetPage.page.getByLabel('Name'), account.name);
    await fillReactInput(budgetPage.page.getByLabel('Balance'), String(account.initialBalance));
    await budgetPage.page.getByLabel('Off budget').click();
    await clickReactAriaButton(budgetPage.page.getByRole('button', { name: 'Create', exact: true }));
    await budgetPage.page
      .getByRole('link', { name: new RegExp(`^${account.name}`) })
      .waitFor({ state: 'visible' });

    await budgetPage.navigateToAccount(account.name);

    await accountPage.clickAddNewTransaction();
    await transactionPage.fill(transaction);
    await transactionPage.save();

    await accountPage.waitForTransactionCount(2);

    const expected = computeExpectedBalance(account.initialBalance, [transaction]);
    const actual = parseMoney(await accountPage.getBalanceText());

    expect(roundMoney(actual)).toBe(roundMoney(expected));
  });

  // ─── Scenario 5: Cancel discards an in-progress transaction ───────────────

  test('cancelling a new transaction leaves the balance unchanged', async ({
    budgetPage,
    accountPage,
    transactionPage,
  }) => {
    const account = generateAccountData({ initialBalance: 300 });
    createdAccountName = account.name;

    await budgetPage.goto();
    await budgetPage.createLocalAccount(account.name, account.initialBalance);
    await budgetPage.navigateToAccount(account.name);

    // Wait for the initial-balance row so the SQLite async fetch is complete
    // before reading the balance — same pattern as every other scenario.
    await accountPage.waitForTransactionCount(1);
    const balanceBefore = parseMoney(await accountPage.getBalanceText());

    // Open the form, fill it, then cancel
    await accountPage.clickAddNewTransaction();
    await transactionPage.fill(generateTransactionData({ amount: 999, type: 'debit' }));
    await transactionPage.cancel();

    // Only the initial-balance row should be present
    await expect(accountPage.transactionRows).toHaveCount(1);

    const balanceAfter = parseMoney(await accountPage.getBalanceText());
    expect(roundMoney(balanceAfter)).toBe(roundMoney(balanceBefore));
  });
});

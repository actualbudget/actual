import { expect, test } from '@playwright/test';

// Structural view of the module harness.html loads from dist/browser.js
// (`typeof import` would pull the whole loot-core type graph in here).
type Api = {
  init(config: { dataDir: string }): Promise<unknown>;
  shutdown(): Promise<void>;
  getBudgets(): Promise<unknown[]>;
  getAccounts(): Promise<Array<{ id: string; name: string }>>;
  runImport(budgetName: string, func: () => Promise<void>): Promise<void>;
  createAccount(account: { name: string }, balance?: number): Promise<string>;
  addTransactions(
    accountId: string,
    transactions: Array<{ date: string; amount: number; notes?: string }>,
  ): Promise<unknown>;
  getTransactions(
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<Array<{ amount: number }>>;
};

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- global Window augmentation requires interface
  interface Window {
    apiReady: Promise<Api>;
  }
}

test('boots, imports a budget, reads it back, and persists', async ({
  page,
}) => {
  await page.goto('/e2e/harness.html');

  await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.init({ dataDir: '/documents' });
  });

  // Backend errors must reject as `{ type: 'APIError', message }` envelopes.
  const error = await page.evaluate(async () => {
    const api = await window.apiReady;
    return api.getAccounts().then(
      () => null,
      (err: { type?: string; message?: string }) => ({
        type: err?.type,
        message: err?.message,
      }),
    );
  });
  expect(error).toEqual({
    type: 'APIError',
    message: 'No budget file is open',
  });

  const result = await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.runImport('e2e-test-budget', async () => {
      const accountId = await api.createAccount({ name: 'Checking' }, 0);
      await api.addTransactions(accountId, [
        { date: '2024-01-15', amount: -1250, notes: 'coffee' },
        { date: '2024-01-16', amount: 50000, notes: 'paycheck' },
      ]);
    });

    const accounts = await api.getAccounts();
    const transactions = await api.getTransactions(
      accounts[0].id,
      '2024-01-01',
      '2024-01-31',
    );
    return {
      accountNames: accounts.map(a => a.name),
      amounts: transactions.map(t => t.amount).sort((a, b) => a - b),
    };
  });
  expect(result.accountNames).toEqual(['Checking']);
  expect(result.amounts).toEqual([-1250, 50000]);

  // Reload the page: the budget must survive in IndexedDB.
  await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.shutdown();
  });
  await page.reload();
  const budgetCount = await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.init({ dataDir: '/documents' });
    const budgets = await api.getBudgets();
    await api.shutdown();
    return budgets.length;
  });
  expect(budgetCount).toBe(1);
});

test('supports a custom dataDir and persists it', async ({ page }) => {
  await page.goto('/e2e/harness.html');

  const result = await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.init({ dataDir: '/budget' });

    await api.runImport('e2e-custom-dir-budget', async () => {
      const accountId = await api.createAccount({ name: 'Savings' }, 0);
      await api.addTransactions(accountId, [
        { date: '2024-02-01', amount: 12345, notes: 'deposit' },
      ]);
    });

    const accounts = await api.getAccounts();
    return { accountNames: accounts.map(a => a.name) };
  });
  expect(result.accountNames).toEqual(['Savings']);

  // Reload the page: the budget must survive in IndexedDB.
  await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.shutdown();
  });
  await page.reload();
  const budgetCount = await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.init({ dataDir: '/budget' });
    const budgets = await api.getBudgets();
    await api.shutdown();
    return budgets.length;
  });
  expect(budgetCount).toBe(1);
});

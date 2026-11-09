import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Structural view of the module harness.html loads from dist/browser.js
// (`typeof import` would pull the whole loot-core type graph in here).
type Api = {
  init(config: { dataDir: string; storageBackend?: string }): Promise<unknown>;
  shutdown(): Promise<void>;
  getBudgets(): Promise<Array<{ id: string }>>;
  loadBudget(id: string): Promise<unknown>;
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

// Where the open page keeps its budgets: absurd-sql's per-file databases
// must be gone, and every sqlite row must carry the sqlite-wasm marker.
async function readStorageLayout(page: Page) {
  return page.evaluate(async () => {
    const names = (await indexedDB.databases()).map(
      database => database.name ?? '',
    );
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('actual');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    type FileRow = { filepath: string; storage?: string };
    const rows = await new Promise<FileRow[]>((resolve, reject) => {
      const request = db
        .transaction(['files'], 'readonly')
        .objectStore('files')
        .getAll();
      request.onsuccess = () => resolve(request.result as FileRow[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return {
      legacyDatabases: names.filter(name => name.startsWith('documents-')),
      sqliteStorage: rows
        .filter(row => row.filepath.endsWith('.sqlite'))
        .map(row => row.storage),
    };
  });
}

test('boots, imports a budget, reads it back, and persists', async ({
  page,
}) => {
  await page.goto('/e2e/harness.html');

  // The harness is served without cross-origin isolation, so the engine
  // has to manage without SharedArrayBuffer
  expect(
    await page.evaluate(() => ({
      isolated: window.crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer,
    })),
  ).toEqual({ isolated: false, sharedArrayBuffer: 'undefined' });

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

  const layout = await readStorageLayout(page);
  expect(layout.legacyDatabases).toEqual([]);
  expect(layout.sqliteStorage.length).toBeGreaterThan(0);
  for (const kind of layout.sqliteStorage) {
    expect(['opfs', 'memory-idb']).toContain(kind);
  }

  // Reload the page: the budget must survive in the browser's storage.
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

  // Reload the page: the budget must survive in the browser's storage.
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

// The fallback saves a budget whole to IndexedDB; its row revision moves on
// every save
async function readFallbackRevision(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('actual');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    type FileRow = { storage?: string; rev?: number };
    const rows = await new Promise<FileRow[]>((resolve, reject) => {
      const request = db
        .transaction(['files'], 'readonly')
        .objectStore('files')
        .getAll();
      request.onsuccess = () => resolve(request.result as FileRow[]);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return rows
      .filter(row => row.storage === 'memory-idb')
      .reduce((sum, row) => sum + (row.rev ?? 0), 0);
  });
}

test('saves fallback changes when the page is hidden, so a reload without shutdown keeps them', async ({
  page,
}) => {
  await page.goto('/e2e/harness.html');
  await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.init({ dataDir: '/documents', storageBackend: 'memory-idb' });
    await api.runImport('e2e-fallback-budget', async () => {
      await api.createAccount({ name: 'Checking' }, 0);
    });
  });
  const saved = await readFallbackRevision(page);

  // A change the fallback would save only after its debounce; hiding the
  // page asks for the save at once
  await page.evaluate(async () => {
    const api = await window.apiReady;
    const [account] = await api.getAccounts();
    await api.addTransactions(account.id, [
      { date: '2024-02-01', amount: -4200, notes: 'hidden' },
    ]);
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect
    .poll(() => readFallbackRevision(page), {
      timeout: 600,
      intervals: [25, 50, 100],
    })
    .toBeGreaterThan(saved);

  // No shutdown(): the saved budget still has the change
  await page.reload();
  const amounts = await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.init({ dataDir: '/documents', storageBackend: 'memory-idb' });
    const [budget] = await api.getBudgets();
    await api.loadBudget(budget.id);
    const [account] = await api.getAccounts();
    const transactions = await api.getTransactions(
      account.id,
      '2024-02-01',
      '2024-02-01',
    );
    await api.shutdown();
    return transactions.map(transaction => transaction.amount);
  });
  expect(amounts).toEqual([-4200]);
});

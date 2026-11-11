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

// Left alone, the fallback saves this long after the last change
const FALLBACK_DEBOUNCE_MS = 1000;

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
  const changeStartedAt = await page.evaluate(async () => {
    const api = await window.apiReady;
    const [account] = await api.getAccounts();
    const startedAt = Date.now();
    await api.addTransactions(account.id, [
      { date: '2024-02-01', amount: -4200, notes: 'hidden' },
    ]);
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    return startedAt;
  });
  // Patient, for a loaded runner; what counts is how long the save took
  await expect
    .poll(() => readFallbackRevision(page), {
      timeout: 5000,
      intervals: [25, 50, 100],
    })
    .toBeGreaterThan(saved);
  // Counted from before the change, so a save the debounce made can never
  // pass: that one lands a full interval after the change at the earliest
  expect(Date.now() - changeStartedAt).toBeLessThan(FALLBACK_DEBOUNCE_MS);

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

// Makes the backend's IndexedDB writes fail the way a full disk does: the
// request is accepted, then its transaction aborts
async function setBackendWritesFailing(page: Page, isFailing: boolean) {
  const [backend] = page.workers();
  await backend.evaluate(failing => {
    const scope = globalThis as typeof globalThis & {
      workingPut?: IDBObjectStore['put'];
    };
    scope.workingPut ??= IDBObjectStore.prototype.put;
    const workingPut = scope.workingPut;
    IDBObjectStore.prototype.put = failing
      ? function failingPut(
          this: IDBObjectStore,
          ...args: Parameters<IDBObjectStore['put']>
        ) {
          const request = workingPut.apply(this, args);
          this.transaction.abort();
          return request;
        }
      : workingPut;
  }, isFailing);
}

test('keeps the worker and the budget when the last changes cannot be saved, and shuts down once they can', async ({
  page,
}) => {
  await page.goto('/e2e/harness.html');
  await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.init({ dataDir: '/documents', storageBackend: 'memory-idb' });
    await api.runImport('e2e-unsaved-budget', async () => {
      await api.createAccount({ name: 'Checking' }, 0);
    });
  });

  await setBackendWritesFailing(page, true);
  const failure = await page.evaluate(async () => {
    const api = await window.apiReady;
    const [account] = await api.getAccounts();
    await api.addTransactions(account.id, [
      { date: '2024-04-01', amount: -900, notes: 'not saved yet' },
    ]);
    return api.shutdown().then(
      () => null,
      (error: Error) => error.message,
    );
  });
  expect(failure).toContain('Could not save the last changes');

  // Nothing was shut down: the worker is there, with the budget open and
  // the change in it
  async function readAmounts() {
    return page.evaluate(async () => {
      const api = await window.apiReady;
      const [account] = await api.getAccounts();
      const transactions = await api.getTransactions(
        account.id,
        '2024-04-01',
        '2024-04-01',
      );
      return transactions.map(transaction => transaction.amount);
    });
  }
  expect(page.workers()).toHaveLength(1);
  expect(await readAmounts()).toEqual([-900]);

  // Nor is it replaced: a second init is refused while it runs
  const refusal = await page.evaluate(async () => {
    const api = await window.apiReady;
    return api
      .init({ dataDir: '/documents', storageBackend: 'memory-idb' })
      .then(
        () => null,
        (error: Error) => error.message,
      );
  });
  expect(refusal).toContain('already running');
  expect(page.workers()).toHaveLength(1);
  expect(await readAmounts()).toEqual([-900]);

  // With room again the same call saves the change and ends the worker
  await setBackendWritesFailing(page, false);
  await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.shutdown();
  });
  await expect.poll(() => page.workers().length).toBe(0);

  await page.reload();
  await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.init({ dataDir: '/documents', storageBackend: 'memory-idb' });
    const [budget] = await api.getBudgets();
    await api.loadBudget(budget.id);
  });
  expect(await readAmounts()).toEqual([-900]);
  await page.evaluate(async () => {
    const api = await window.apiReady;
    await api.shutdown();
  });
});

// The budget locks held anywhere in this origin, the API's worker included
function countHeldBudgetLocks(page: Page) {
  return page.evaluate(async () => {
    const { held = [] } = await navigator.locks.query();
    return held.filter(lock => lock.name?.startsWith('actual-budget:')).length;
  });
}

for (const storageBackend of ['opfs', 'memory-idb']) {
  test(`gives the budget up when the page leaves and opens it again when it comes back (${storageBackend})`, async ({
    page,
  }) => {
    await page.goto('/e2e/harness.html');
    await page.evaluate(async backend => {
      const api = await window.apiReady;
      await api.init({ dataDir: '/documents', storageBackend: backend });
      await api.runImport('e2e-lifecycle-budget', async () => {
        const accountId = await api.createAccount({ name: 'Checking' }, 0);
        await api.addTransactions(accountId, [
          { date: '2024-03-01', amount: -700, notes: 'before leaving' },
        ]);
      });
    }, storageBackend);
    expect(await countHeldBudgetLocks(page)).toBe(1);

    // What a browser fires when the page goes into its back/forward cache.
    // WebKit keeps the worker of such a page, locks and all, so the lock
    // has to go for the next page to open the same budget
    await page.evaluate(() => {
      window.dispatchEvent(
        new PageTransitionEvent('pagehide', { persisted: true }),
      );
    });
    await expect.poll(() => countHeldBudgetLocks(page)).toBe(0);

    // And when it comes back out of it: the budget is open again, with
    // what was saved before the page left. What was asked while the page
    // was away, or is asked the moment it is back, waits for that instead
    // of meeting the closed database
    const answers = await page.evaluate(async () => {
      const api = await window.apiReady;
      const askedWhileAway = api.getAccounts();
      window.dispatchEvent(
        new PageTransitionEvent('pageshow', { persisted: true }),
      );
      const askedOnReturn = api.getAccounts();
      const [whileAway, onReturn] = await Promise.all([
        askedWhileAway,
        askedOnReturn,
      ]);
      const transactions = await api.getTransactions(
        onReturn[0].id,
        '2024-03-01',
        '2024-03-01',
      );
      return {
        whileAway: whileAway.map(account => account.name),
        onReturn: onReturn.map(account => account.name),
        amounts: transactions.map(transaction => transaction.amount),
      };
    });
    expect(answers).toEqual({
      whileAway: ['Checking'],
      onReturn: ['Checking'],
      amounts: [-700],
    });
    expect(await countHeldBudgetLocks(page)).toBe(1);

    await page.evaluate(async () => {
      const api = await window.apiReady;
      await api.shutdown();
    });
  });

  test(`a page that leaves again while it reopens its budget holds nothing, and reopens it on its next return (${storageBackend})`, async ({
    page,
  }) => {
    await page.goto('/e2e/harness.html');
    await page.evaluate(async backend => {
      const api = await window.apiReady;
      await api.init({ dataDir: '/documents', storageBackend: backend });
      await api.runImport('e2e-back-and-forth-budget', async () => {
        await api.createAccount({ name: 'Checking' }, 0);
      });
    }, storageBackend);

    // Back, forward and back again before the budget is open again, the
    // second departure landing at a different step of the reopening each time
    for (const delayMs of [0, 10, 30, 60, 120, 250]) {
      await page.evaluate(async delay => {
        const dispatch = (type: string) =>
          window.dispatchEvent(
            new PageTransitionEvent(type, { persisted: true }),
          );
        dispatch('pagehide');
        dispatch('pageshow');
        await new Promise(resolve => setTimeout(resolve, delay));
        dispatch('pagehide');
      }, delayMs);
      // The reopening that began in between must not take the budget back
      await page.waitForTimeout(1000);
      expect(await countHeldBudgetLocks(page), `after ${delayMs} ms`).toBe(0);

      const accountNames = await page.evaluate(async () => {
        const api = await window.apiReady;
        window.dispatchEvent(
          new PageTransitionEvent('pageshow', { persisted: true }),
        );
        const accounts = await api.getAccounts();
        return accounts.map(account => account.name);
      });
      expect(accountNames, `after ${delayMs} ms`).toEqual(['Checking']);
      expect(await countHeldBudgetLocks(page), `after ${delayMs} ms`).toBe(1);
    }

    await page.evaluate(async () => {
      const api = await window.apiReady;
      await api.shutdown();
    });
  });

  test(`holds nothing for a page that leaves while its budget is loading (${storageBackend})`, async ({
    page,
  }) => {
    await page.goto('/e2e/harness.html');
    const budgetId = await page.evaluate(async backend => {
      const api = await window.apiReady;
      await api.init({ dataDir: '/documents', storageBackend: backend });
      await api.runImport('e2e-leaving-budget', async () => {
        await api.createAccount({ name: 'Checking' }, 0);
      });
      const [budget] = await api.getBudgets();
      // Start again with the budget closed
      await api.shutdown();
      await api.init({ dataDir: '/documents', storageBackend: backend });
      return budget.id;
    }, storageBackend);

    // The load is cut short, rather than left to take the budget for a
    // page that has gone
    const interruption = await page.evaluate(async id => {
      const api = await window.apiReady;
      const loading = api.loadBudget(id).then(
        () => null,
        (error: { code?: string }) => error.code,
      );
      window.dispatchEvent(
        new PageTransitionEvent('pagehide', { persisted: true }),
      );
      return loading;
    }, budgetId);
    expect(interruption).toBe('storage-unavailable');
    await expect.poll(() => countHeldBudgetLocks(page)).toBe(0);

    // Back out of the cache, the budget loads as usual
    const accountNames = await page.evaluate(async id => {
      const api = await window.apiReady;
      window.dispatchEvent(
        new PageTransitionEvent('pageshow', { persisted: true }),
      );
      await api.loadBudget(id);
      const accounts = await api.getAccounts();
      return accounts.map(account => account.name);
    }, budgetId);
    expect(accountNames).toEqual(['Checking']);
    expect(await countHeldBudgetLocks(page)).toBe(1);

    await page.evaluate(async () => {
      const api = await window.apiReady;
      await api.shutdown();
    });
  });
}

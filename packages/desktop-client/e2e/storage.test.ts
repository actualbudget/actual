import type { Page } from '@playwright/test';

import {
  addE2EInitScripts,
  E2E_STORAGE_BACKEND,
  expect,
  MANUAL_STORAGE_BACKEND_FLAG,
  test,
} from './fixtures';
import { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import { inspectStorage } from './page-models/storage-inspector';
import type { StorageSnapshot } from './page-models/storage-inspector';

// Mirrors loot-core/src/platform/client/browser-preload/storage-backend.ts
const STORAGE_BACKEND_KEY = 'actual:storage-backend';
const requestedBackend = E2E_STORAGE_BACKEND ?? 'legacy';
const usesNewStorage = requestedBackend !== 'legacy';
// The IndexedDB fallback persists on a one second debounce
const PERSIST_WAIT_MS = 2000;

function expectStorageLayout(
  snapshot: StorageSnapshot,
  layout: 'legacy' | 'new',
) {
  expect(snapshot.sqliteRows.length).toBeGreaterThan(0);
  const legacyDatabases = snapshot.databases.filter(name =>
    name.startsWith('documents-'),
  );
  if (layout === 'legacy') {
    expect(legacyDatabases.length).toBeGreaterThan(0);
    for (const row of snapshot.sqliteRows) {
      expect(row.storage).toBeUndefined();
    }
    return;
  }
  expect(legacyDatabases).toEqual([]);
  for (const row of snapshot.sqliteRows) {
    expect(['opfs', 'memory-idb']).toContain(row.storage);
    if (row.storage === 'opfs') {
      expect(
        snapshot.poolFiles.some(file => file.startsWith('/actual/pools/')),
      ).toBe(true);
    } else {
      expect(row.hasBytes).toBe(true);
    }
  }
}

async function openAllySavings(page: Page) {
  const accountPage = await new Navigation(page).goToAccountPage(
    'Ally Savings',
  );
  await accountPage.waitFor();
  return accountPage;
}

// The header shows 0.00 until the account's query has answered
async function readAllySavingsBalance(page: Page) {
  const accountPage = await openAllySavings(page);
  await expect(accountPage.accountBalance).not.toHaveText(/^(0\.00)?$/);
  return (await accountPage.accountBalance.textContent())?.trim();
}

async function expectAllySavingsBalance(page: Page, balance?: string) {
  const accountPage = await openAllySavings(page);
  await expect(accountPage.accountBalance).toHaveText(balance ?? '');
}

// The dialog that reports a budget that could not be moved
function failedMoveReport(page: Page) {
  return page.getByTestId('storage-migration-failed-modal');
}

// Leaves the page on the list of files, running the requested storage,
// with a budget the legacy storage wrote that has yet to be opened;
// resolves the balance to find again
async function createLegacyBudgetThenSwitch(page: Page) {
  // The URL flag wins over the stored choice for this first load
  await page.goto(`/?storage=legacy`);
  await page.evaluate(
    flag => sessionStorage.setItem(flag, '1'),
    MANUAL_STORAGE_BACKEND_FLAG,
  );
  await new ConfigurationPage(page).createTestFile();
  const balance = await readAllySavingsBalance(page);
  expectStorageLayout(await inspectStorage(page), 'legacy');
  // A budget the backend has closed is not opened by the next start
  await page.evaluate(() => window.$send('close-budget'));
  await page.evaluate(
    ([key, backend]) => localStorage.setItem(key, backend),
    [STORAGE_BACKEND_KEY, requestedBackend],
  );
  await page.goto('/');
  await expect(page.getByText('Test Budget')).toBeVisible({
    timeout: 60_000,
  });
  return balance;
}

test.describe('Browser storage', () => {
  let page: Page;

  test.afterEach(async () => {
    await page?.close();
  });

  test('keeps the budget across a reload', async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    const balance = await readAllySavingsBalance(page);
    expect(balance).toBeTruthy();

    await page.waitForTimeout(PERSIST_WAIT_MS);
    expectStorageLayout(
      await inspectStorage(page),
      usesNewStorage ? 'new' : 'legacy',
    );

    await page.reload();
    const accountPage = new AccountPage(page);
    await accountPage.waitFor({ timeout: 60_000 });
    await expect(accountPage.accountBalance).toHaveText(balance ?? '');
  });

  test('moves a budget created under the legacy storage', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    // The URL flag wins over the stored choice for this first load
    await page.goto(`/?storage=legacy`);
    await page.evaluate(
      flag => sessionStorage.setItem(flag, '1'),
      MANUAL_STORAGE_BACKEND_FLAG,
    );
    await new ConfigurationPage(page).createTestFile();
    const balance = await readAllySavingsBalance(page);
    expectStorageLayout(await inspectStorage(page), 'legacy');

    // Switch the flag and reload: the budget is moved when it is reopened
    await page.evaluate(
      ([key, backend]) => localStorage.setItem(key, backend),
      [STORAGE_BACKEND_KEY, requestedBackend],
    );
    await page.goto('/');
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expectAllySavingsBalance(page, balance);

    await page.waitForTimeout(PERSIST_WAIT_MS);
    expectStorageLayout(await inspectStorage(page), 'new');
  });

  test('turns the new storage on from the settings', async ({ browser }) => {
    page = await browser.newPage();
    // The URL flag wins over the stored choice for this first load
    await page.goto(`/?storage=legacy`);
    await page.evaluate(
      flag => sessionStorage.setItem(flag, '1'),
      MANUAL_STORAGE_BACKEND_FLAG,
    );
    await new ConfigurationPage(page).createTestFile();
    const balance = await readAllySavingsBalance(page);

    const settingsPage = await new Navigation(page).goToSettingsPage();
    await settingsPage.goToSection('Experimental');
    const toggle = page.getByRole('checkbox', {
      name: 'New browser storage engine',
    });
    await expect(toggle).not.toBeChecked();
    // Stores the choice and reloads; the budget is moved as it reopens
    const reloaded = page.waitForEvent('load', { timeout: 60_000 });
    await toggle.click();
    await reloaded;
    await settingsPage.waitFor({ timeout: 60_000 });
    await settingsPage.goToSection('Experimental');
    await expect(toggle).toBeChecked();
    await expectAllySavingsBalance(page, balance);
    await expect(async () => {
      expectStorageLayout(await inspectStorage(page), 'new');
    }).toPass({ timeout: 10_000 });
  });

  test('switches back to the legacy storage from the settings', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    const balance = await readAllySavingsBalance(page);
    await page.evaluate(
      flag => sessionStorage.setItem(flag, '1'),
      MANUAL_STORAGE_BACKEND_FLAG,
    );

    const settingsPage = await new Navigation(page).goToSettingsPage();
    await settingsPage.goToSection('Experimental');
    const toggle = page.getByRole('checkbox', {
      name: 'New browser storage engine',
    });
    await expect(toggle).toBeChecked();
    // Moves every budget back, then reloads into the legacy engine, which
    // reopens the budget on the settings page
    const reloaded = page.waitForEvent('load', { timeout: 60_000 });
    await toggle.click();
    await reloaded;
    await settingsPage.waitFor({ timeout: 60_000 });
    await expectAllySavingsBalance(page, balance);
    expectStorageLayout(await inspectStorage(page), 'legacy');
    expect(
      await page.evaluate(
        key => localStorage.getItem(key),
        STORAGE_BACKEND_KEY,
      ),
    ).toBe('legacy');
  });

  test('offers the way back when a budget cannot be moved', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    const balance = await createLegacyBudgetThenSwitch(page);
    await setLegacyCopyUnreadable(page, true);

    await page.getByText('Test Budget').click();
    const report = failedMoveReport(page);
    await expect(report).toBeVisible({ timeout: 60_000 });
    // Named the way the user knows it, not by its id
    await expect(
      report.getByText(
        'Moving budget "Test Budget" to the new browser storage failed. Nothing was deleted',
      ),
    ).toBeVisible();
    expectStorageLayout(await inspectStorage(page), 'legacy');

    // While going back is under way the report cannot be dismissed: it is
    // where a failure to would be shown
    const reloaded = page.waitForEvent('load', { timeout: 60_000 });
    const busy = keepBackendBusy(page, 3000);
    await report
      .getByRole('button', { name: 'Go back to previous storage' })
      .click();
    await page.keyboard.press('Escape');
    // Long enough for a report that was dismissed to have gone
    await page.waitForTimeout(500);
    await expect(report).toBeVisible();
    await expect(report.getByRole('button', { name: 'Close' })).toBeHidden();
    await busy;

    // Back on the previous engine the budget opens as it did before
    await reloaded;
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expectAllySavingsBalance(page, balance);
    expectStorageLayout(await inspectStorage(page), 'legacy');
    const settingsPage = await new Navigation(page).goToSettingsPage();
    await settingsPage.goToSection('Experimental');
    await expect(
      page.getByRole('checkbox', { name: 'New browser storage engine' }),
    ).not.toBeChecked();
  });

  test('moves a budget when it is opened again after a failed move', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    const balance = await createLegacyBudgetThenSwitch(page);
    await setLegacyCopyUnreadable(page, true);
    await page.getByText('Test Budget').click();
    const report = failedMoveReport(page);
    await expect(report).toBeVisible({ timeout: 60_000 });
    await report.getByRole('button', { name: 'OK' }).click();
    await expect(report).toBeHidden();

    await setLegacyCopyUnreadable(page, false);
    await page.getByText('Test Budget').click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expectAllySavingsBalance(page, balance);
    await expect(async () => {
      expectStorageLayout(await inspectStorage(page), 'new');
    }).toPass({ timeout: 10_000 });
  });

  test('moves a budget whose old copy is marked as write-ahead logged', async ({
    browser,
  }) => {
    // Only the OPFS pool takes a file out of that mode as it imports it;
    // the fallback loads the file into memory, which sqlite refuses
    test.skip(requestedBackend !== 'opfs', 'only meaningful for OPFS');

    page = await browser.newPage();
    const balance = await createLegacyBudgetThenSwitch(page);
    await rewriteLegacyFirstBlocks(page, 'mark-write-ahead-logged');

    await page.getByText('Test Budget').click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expectAllySavingsBalance(page, balance);
    await expect(async () => {
      expectStorageLayout(await inspectStorage(page), 'new');
    }).toPass({ timeout: 10_000 });
  });

  test('offers no way back once another budget is on the new storage', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    await createLegacyBudgetThenSwitch(page);
    // A second budget is made on the new storage, which the previous
    // engine could not read
    await page.getByRole('button', { name: 'Create new file' }).click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await page.evaluate(() => window.$send('close-budget'));
    await page.reload();
    await expect(page.getByText('Test Budget')).toBeVisible({
      timeout: 60_000,
    });

    await setLegacyCopyUnreadable(page, true);
    await page.getByText('Test Budget').click();
    const report = failedMoveReport(page);
    await expect(report).toBeVisible({ timeout: 60_000 });
    await expect(report.getByText('already use the new storage')).toBeVisible();
    await expect(
      report.getByRole('button', { name: 'Go back to previous storage' }),
    ).toBeHidden();
    await report.getByRole('button', { name: 'OK' }).click();
    await expect(report).toBeHidden();
  });

  test('reports a failed move to an app that starts inside the budget', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    await page.goto(`/?storage=legacy`);
    await page.evaluate(
      flag => sessionStorage.setItem(flag, '1'),
      MANUAL_STORAGE_BACKEND_FLAG,
    );
    await new ConfigurationPage(page).createTestFile();
    await page.evaluate(
      ([key, backend]) => localStorage.setItem(key, backend),
      [STORAGE_BACKEND_KEY, requestedBackend],
    );
    // From a page of the same site that runs no app, so nothing writes
    // the copy again behind this
    await page.goto('/data-file-index.txt');
    await rewriteLegacyFirstBlocks(page, 'blank');

    // The budget is reopened at once, cannot be moved, and the app then
    // goes to its list of files: the report has to outlast that
    await page.goto('/accounts');
    const report = failedMoveReport(page);
    await expect(report).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole('grid', { name: 'Budget files' }).getByText('Test Budget'),
    ).toBeVisible();
    // Still there, and it names the budget although no list was loaded
    // when it was raised
    await expect(report.getByText('Moving budget "Test Budget"')).toBeVisible();
  });

  test('a second tab cannot open the same budget at the same time', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'the legacy storage has no budget lock');

    const context = await browser.newContext();
    await addE2EInitScripts(context);
    page = await context.newPage();
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();

    // Playwright runs direct workers, so the second tab is a second backend
    const secondTab = await context.newPage();
    const dialogs: string[] = [];
    secondTab.on('dialog', dialog => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    await secondTab.goto('/');
    await expect
      .poll(() => dialogs.join('\n'), { timeout: 45_000 })
      .toMatch(/Budget "Test Budget" is already open in another tab/);

    // Once the first tab is gone its budget can be opened here. The failed
    // open forgot the last budget, so it is picked from the file list.
    await page.close();
    await secondTab.reload();
    await secondTab.getByText('Test Budget').click({ timeout: 60_000 });
    await expect(secondTab.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await secondTab.close();
    await context.close();
  });

  test('a change of engine in another tab does not reload a tab over changes it could not save', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    // The IndexedDB fallback, which keeps a budget in memory between saves
    await page.goto('/?storage=memory-idb');
    await page.evaluate(
      flag => sessionStorage.setItem(flag, '1'),
      MANUAL_STORAGE_BACKEND_FLAG,
    );
    await new ConfigurationPage(page).createTestFile();
    const accountPage = await openAllySavings(page);

    await setBackendWritesFailing(page, true);
    await accountPage.createSingleTransaction({
      payee: '',
      notes: 'only in memory',
      debit: '10.00',
    });
    const unsavedTransaction = accountPage.transactionTableRow.filter({
      hasText: 'only in memory',
    });
    await expect(unsavedTransaction).toBeVisible();
    // The save and its one retry have failed, and the app has said so
    await expect(page.getByText('Unable to save changes')).toBeVisible();

    // The tab stays as it is, with the change still in it
    await page.evaluate(() => {
      document.body.dataset.sameDocument = 'true';
    });
    await announceEngineChange(page);
    // Long enough for a relaunch that was not held back to have begun
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toHaveAttribute(
      'data-same-document',
      'true',
    );
    await expect(unsavedTransaction).toBeVisible();

    // Once the change can be saved, the tab saves it and relaunches
    await setBackendWritesFailing(page, false);
    const relaunched = page.waitForEvent('load', { timeout: 60_000 });
    await announceEngineChange(page);
    await relaunched;
    await expect(unsavedTransaction).toBeVisible({ timeout: 60_000 });
  });
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

// Makes the backend read an empty first block from any absurd-sql copy,
// where the sqlite header is, or the stored one again. A move then
// fails with nothing changed
async function setLegacyCopyUnreadable(page: Page, isUnreadable: boolean) {
  const [backend] = page.workers();
  await backend.evaluate(unreadable => {
    const scope = globalThis as typeof globalThis & {
      workingGet?: IDBObjectStore['get'];
    };
    scope.workingGet ??= IDBObjectStore.prototype.get;
    const workingGet = scope.workingGet;
    IDBObjectStore.prototype.get = unreadable
      ? function emptyFirstBlock(
          this: IDBObjectStore,
          ...args: Parameters<IDBObjectStore['get']>
        ) {
          const request = workingGet.apply(this, args);
          if (this.name === 'data' && args[0] === 0) {
            Object.defineProperty(request, 'result', {
              get: () => new ArrayBuffer(4096),
            });
          }
          return request;
        }
      : workingGet;
  }, isUnreadable);
}

// Rewrites the first block of every absurd-sql copy for good, from the
// page. Blanked, a move finds no sqlite header there. Marked as write-ahead
// logged, the header says the file was last written in that mode (its
// bytes 18 and 19), which the app never does but another sqlite tool can
async function rewriteLegacyFirstBlocks(
  page: Page,
  change: 'blank' | 'mark-write-ahead-logged',
) {
  await page.evaluate(async requestedChange => {
    const databases = await indexedDB.databases();
    for (const { name } of databases) {
      if (!name?.startsWith('documents-')) {
        continue;
      }
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(['data'], 'readwrite');
          const store = transaction.objectStore('data');
          if (requestedChange === 'blank') {
            store.put(new ArrayBuffer(4096), 0);
          } else {
            const read = store.get(0);
            read.onsuccess = () => {
              const block = new Uint8Array(read.result as ArrayBuffer);
              block.set([2, 2], 18);
              store.put(block.buffer, 0);
            };
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
    }
  }, change);
}

// Keeps the backend from answering for a while, so that whatever it is
// asked meanwhile stays under way
function keepBackendBusy(page: Page, milliseconds: number) {
  const [backend] = page.workers();
  return backend.evaluate(duration => {
    const end = Date.now() + duration;
    while (Date.now() < end) {
      // Spinning, as a waiting worker would still take messages
    }
  }, milliseconds);
}

// What a tab hears when another one stores a different engine
async function announceEngineChange(page: Page) {
  await page.evaluate(key => {
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, STORAGE_BACKEND_KEY);
}

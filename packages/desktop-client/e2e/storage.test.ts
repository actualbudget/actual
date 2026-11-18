import type { Locator, Page } from '@playwright/test';

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
    // where a failure to would be shown. The request is kept from the
    // backend, so it stays under way until the test answers it
    const goBack = report.getByRole('button', {
      name: 'Go back to previous storage',
    });
    await holdBackendRequests(page, 'storage-revert');
    await goBack.click();
    await expect(goBack).toBeDisabled();
    await expect(report.getByRole('button', { name: 'Close' })).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(report).toBeVisible();
    // One press asks once: a second request would get the same answer
    expect(
      await answerHeldBackendRequests(page, { error: 'revert-failed' }),
    ).toBe(1);
    // Announced in the report, which only one still there can show
    await expect(report.getByRole('alert')).toHaveText(/Switching back failed/);

    // Back on the previous engine the budget opens as it did before, even
    // where the choice cannot be stored: the address carries it too
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('full', 'QuotaExceededError');
      };
    });
    const reloaded = page.waitForEvent('load', { timeout: 60_000 });
    await goBack.click();
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

  test('goes back for no budget but the one that failed to move', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    await createLegacyBudgetThenSwitch(page);
    await setLegacyCopyUnreadable(page, true);
    await page.getByText('Test Budget').click();
    const report = failedMoveReport(page);
    const goBack = report.getByRole('button', {
      name: 'Go back to previous storage',
    });
    await expect(goBack).toBeVisible({ timeout: 60_000 });

    // Another budget comes to live in the new storage while the report is
    // up, as when another tab moves one
    await recordBudgetInNewStorage(page, '/documents/Actual/other/db.sqlite');
    await goBack.click();
    // Going back would move that one as well, which is left to the setting
    await expect(report.getByText('already use the new storage')).toBeVisible();
    await expect(goBack).toBeHidden();
    expect(
      await page.evaluate(
        key => localStorage.getItem(key),
        STORAGE_BACKEND_KEY,
      ),
    ).toBe(requestedBackend);
  });

  test('says that going back failed when it cannot check for other budgets', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    await createLegacyBudgetThenSwitch(page);
    await setLegacyCopyUnreadable(page, true);
    await page.getByText('Test Budget').click();
    const report = failedMoveReport(page);
    const goBack = report.getByRole('button', {
      name: 'Go back to previous storage',
    });
    await expect(goBack).toBeVisible({ timeout: 60_000 });

    await setFileRowLookupFailing(page);
    await goBack.click();
    await expect(report.getByRole('alert')).toHaveText(/Switching back failed/);
    await expect(goBack).toBeEnabled();
    // The report says it; it is not raised as an internal error as well.
    // Long enough for that notification to have come up, and looked for
    // once, as it goes away again by itself
    await page.waitForTimeout(500);
    expect(
      await page.getByText('Something internally went wrong').count(),
    ).toBe(0);
    expectStorageLayout(await inspectStorage(page), 'legacy');
  });

  test('says so when it cannot tell whether going back is possible', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    await createLegacyBudgetThenSwitch(page);
    await setLegacyCopyUnreadable(page, true);
    await setFileRowLookupFailing(page);
    await page.getByText('Test Budget').click();
    const report = failedMoveReport(page);
    await expect(report.getByText('Nothing was deleted')).toBeVisible({
      timeout: 60_000,
    });
    // Neither the way back nor a claim that other budgets have moved
    await expect(report.getByText('could not check')).toBeVisible();
    await expect(
      report.getByRole('button', { name: 'Go back to previous storage' }),
    ).toBeHidden();
    await expect(report.getByText('already use the new storage')).toBeHidden();
    await expect(report.getByText('If it keeps failing')).toBeHidden();
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

    // The budget is reopened at once and cannot be moved. The report is
    // shown without waiting for the server's list of files, which a slow
    // server keeps the app loading on, and which is held here
    await page.addInitScript(holdRequests, 'get-remote-files');
    await page.goto('/accounts');
    const report = failedMoveReport(page);
    await expect(report).toBeVisible({ timeout: 60_000 });
    await expect
      .poll(() => isShownToTheUser(report.getByText('Nothing was deleted')))
      .toBe(true);

    // The app then goes to its list of files, which waits for that list
    // too: the report has to outlast that
    await answerHeldBackendRequests(page, null);
    await expect(
      page.getByRole('grid', { name: 'Budget files' }).getByText('Test Budget'),
    ).toBeVisible();
    // Still there to be seen, and it names the budget although no list
    // was loaded when it was raised
    const namedBudget = report.getByText('Moving budget "Test Budget"');
    await expect(namedBudget).toBeVisible();
    await expect.poll(() => isShownToTheUser(namedBudget)).toBe(true);
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

type HeldRequest = { backend: Worker; id: string };
type GatedWindow = Window & {
  heldBackendRequests?: HeldRequest[];
  stopHoldingBackendRequests?: () => void;
};

// Runs in the page: keeps every request of that name from reaching the
// backend, so that they stay under way until `answerHeldBackendRequests`
// answers them in the backend's place. As an init script it holds the
// requests the app makes as it starts
function holdRequests(requestName: string) {
  const gated = window as GatedWindow;
  const held: HeldRequest[] = [];
  gated.heldBackendRequests = held;
  const workingPost = Worker.prototype.postMessage;
  gated.stopHoldingBackendRequests = () => {
    Worker.prototype.postMessage = workingPost;
  };
  Worker.prototype.postMessage = function holdingPost(
    this: Worker,
    ...args: Parameters<Worker['postMessage']>
  ) {
    const [message] = args;
    if (message?.name === requestName) {
      held.push({ backend: this, id: message.id });
    } else {
      workingPost.apply(this, args);
    }
  };
}

async function holdBackendRequests(page: Page, name: string) {
  await page.evaluate(holdRequests, name);
}

// Answers the requests held so far, once there is one, and lets later
// ones through again. Resolves how many it answered
async function answerHeldBackendRequests(
  page: Page,
  result: unknown,
): Promise<number> {
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as GatedWindow).heldBackendRequests?.length ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  return page.evaluate(answer => {
    const gated = window as GatedWindow;
    gated.stopHoldingBackendRequests?.();
    const held = gated.heldBackendRequests ?? [];
    for (const { backend, id } of held) {
      backend.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'reply', id, result: answer },
        }),
      );
    }
    gated.heldBackendRequests = [];
    return held.length;
  }, result);
}

// Whether nothing around the element hides it. Dialogs are kept in place
// but see-through while the app shows a loading text, which the usual
// visibility check does not notice
function isShownToTheUser(element: Locator) {
  return element.evaluate(shown => {
    for (
      let ancestor: Element | null = shown;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      if (getComputedStyle(ancestor).opacity === '0') {
        return false;
      }
    }
    return true;
  });
}

// Records a budget file as living in the new storage, from the page, the
// way the backend of another tab would after moving one
async function recordBudgetInNewStorage(page: Page, filepath: string) {
  await page.evaluate(async path => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('actual');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(['files'], 'readwrite');
        transaction
          .objectStore('files')
          .put({ filepath: path, contents: '', storage: 'opfs' });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }, filepath);
}

// Makes the backend fail to walk its record of budget files, which is
// how it tells whether other budgets live in the new storage
async function setFileRowLookupFailing(page: Page) {
  const [backend] = page.workers();
  await backend.evaluate(() => {
    const workingOpenCursor = IDBObjectStore.prototype.openCursor;
    IDBObjectStore.prototype.openCursor = function failingOpenCursor(
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['openCursor']>
    ) {
      if (this.name === 'files') {
        throw new DOMException('unreadable', 'UnknownError');
      }
      return workingOpenCursor.apply(this, args);
    };
  });
}

// What a tab hears when another one stores a different engine
async function announceEngineChange(page: Page) {
  await page.evaluate(key => {
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, STORAGE_BACKEND_KEY);
}

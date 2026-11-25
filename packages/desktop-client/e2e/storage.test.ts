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
// The IndexedDB fallback persists on a one second debounce
const PERSIST_WAIT_MS = 2000;
const SEEDED_BUDGET_ID = 'seeded-budget';
const SEEDED_BUDGET_NAME = 'Seeded Budget';

// Every sqlite file is held by the sqlite-wasm storage and nothing is left
// in the previous engine's per-file databases
function expectNewStorageLayout(snapshot: StorageSnapshot) {
  expect(snapshot.sqliteRows.length).toBeGreaterThan(0);
  expect(
    snapshot.databases.filter(name => name.startsWith('documents-')),
  ).toEqual([]);
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

async function readAllySavingsBalance(page: Page) {
  const accountPage = await new Navigation(page).goToAccountPage(
    'Ally Savings',
  );
  await accountPage.waitFor();
  // The header shows 0.00 until the account's query has answered
  await expect(accountPage.accountBalance).not.toHaveText(/^(0\.00)?$/);
  return (await accountPage.accountBalance.textContent())?.trim();
}

// Writes a budget the way the previous engine (absurd-sql) left it: marker
// rows in the `actual` database and the sqlite file as page-sized blocks in
// a database of its own. The bundled default budget is a valid, empty file.
async function seedPreviousEngineBudget(
  page: Page,
  { isLastOpened = false }: { isLastOpened?: boolean } = {},
) {
  await page.evaluate(
    async ({ id, name, isLastOpened }) => {
      const response = await fetch('/data/default-db.sqlite');
      const bytes = new Uint8Array(await response.arrayBuffer());
      const pageSize = (bytes[16] << 8) | bytes[17];
      const directory = `/documents/Actual/${id}`;
      const open = (
        databaseName: string,
        version: number,
        upgrade: (database: IDBDatabase) => void,
      ) =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(databaseName, version);
          request.onupgradeneeded = () => upgrade(request.result);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      const settled = (transaction: IDBTransaction) =>
        new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });

      const actual = await open('actual', 9, database => {
        if (!database.objectStoreNames.contains('asyncStorage')) {
          database.createObjectStore('asyncStorage');
        }
        if (!database.objectStoreNames.contains('files')) {
          database.createObjectStore('files', { keyPath: 'filepath' });
        }
      });
      const files = actual.transaction(['files', 'asyncStorage'], 'readwrite');
      if (isLastOpened) {
        // Which budget the app opens as it starts
        files.objectStore('asyncStorage').put(id, 'lastBudget');
      }
      files.objectStore('files').put({
        filepath: `${directory}/metadata.json`,
        contents: JSON.stringify({ id, budgetName: name }),
      });
      files
        .objectStore('files')
        .put({ filepath: `${directory}/db.sqlite`, contents: '' });
      await settled(files);
      actual.close();

      const legacyName = `${directory}/db.sqlite`
        .replace(/^\//, '')
        .replace(/\//g, '-');
      const legacy = await open(legacyName, 2, database => {
        database.createObjectStore('data');
      });
      const data = legacy.transaction(['data'], 'readwrite');
      data.objectStore('data').put({ size: bytes.length }, -1);
      for (
        let offset = 0, key = 0;
        offset < bytes.length;
        offset += pageSize, key++
      ) {
        const block = new Uint8Array(pageSize);
        block.set(bytes.subarray(offset, offset + pageSize));
        data.objectStore('data').put(block.buffer, key);
      }
      await settled(data);
      legacy.close();
    },
    { id: SEEDED_BUDGET_ID, name: SEEDED_BUDGET_NAME, isLastOpened },
  );
}

// The dialog that reports a budget that could not be moved
function failedMoveReport(page: Page) {
  return page.getByTestId('storage-migration-failed-modal');
}

// Lets the app create its IndexedDB schema, plants a budget in the
// previous engine's layout and leaves the page on the list of files
async function openFileListWithSeededBudget(page: Page) {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Try the demo', exact: true })
    .waitFor({ timeout: 60_000 });
  await seedPreviousEngineBudget(page);
  await page.goto('/');
  await expect(page.getByText(SEEDED_BUDGET_NAME)).toBeVisible({
    timeout: 60_000,
  });
}

// The budget is still where the previous engine left it: its own
// database of blocks, and a row that names no storage
function expectPreviousEngineLayout(snapshot: StorageSnapshot) {
  expect(
    snapshot.databases.filter(name => name.startsWith('documents-')),
  ).toHaveLength(1);
  expect(snapshot.sqliteRows.length).toBeGreaterThan(0);
  for (const row of snapshot.sqliteRows) {
    expect(row.storage).toBeUndefined();
  }
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
    expectNewStorageLayout(await inspectStorage(page));

    await page.reload();
    const accountPage = new AccountPage(page);
    await accountPage.waitFor({ timeout: 60_000 });
    await expect(accountPage.accountBalance).toHaveText(balance ?? '');
  });

  test('moves a budget left by the previous engine', async ({ browser }) => {
    page = await browser.newPage();
    await openFileListWithSeededBudget(page);

    // The budget is listed and moved into the new storage when opened
    await page.getByText(SEEDED_BUDGET_NAME).click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });

    await page.waitForTimeout(PERSIST_WAIT_MS);
    expectNewStorageLayout(await inspectStorage(page));
  });

  test('reports a budget that cannot be moved, and moves it when opened again', async ({
    browser,
  }) => {
    page = await browser.newPage();
    await openFileListWithSeededBudget(page);
    await setLegacyCopyUnreadable(page, true);

    await page.getByText(SEEDED_BUDGET_NAME).click();
    const report = failedMoveReport(page);
    await expect(report).toBeVisible({ timeout: 60_000 });
    // Named the way the user knows it, not by its id
    await expect(
      report.getByText(
        `Moving budget "${SEEDED_BUDGET_NAME}" to the new browser storage failed. Nothing was deleted`,
      ),
    ).toBeVisible();
    expectPreviousEngineLayout(await inspectStorage(page));
    await report.getByRole('button', { name: 'OK' }).click();
    await expect(report).toBeHidden();

    await setLegacyCopyUnreadable(page, false);
    await page.getByText(SEEDED_BUDGET_NAME).click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expect(async () => {
      expectNewStorageLayout(await inspectStorage(page));
    }).toPass({ timeout: 10_000 });
  });

  test('moves a budget whose old copy is marked as write-ahead logged', async ({
    browser,
  }) => {
    // Only the OPFS pool takes a file out of that mode as it imports it;
    // the fallback loads the file into memory, which sqlite refuses
    test.skip(E2E_STORAGE_BACKEND === 'memory-idb', 'only meaningful for OPFS');

    page = await browser.newPage();
    await openFileListWithSeededBudget(page);
    await rewriteLegacyFirstBlocks(page, 'mark-write-ahead-logged');

    await page.getByText(SEEDED_BUDGET_NAME).click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expect(async () => {
      expectNewStorageLayout(await inspectStorage(page));
    }).toPass({ timeout: 10_000 });
  });

  test('reports a failed move to an app that starts inside the budget', async ({
    browser,
  }) => {
    page = await browser.newPage();
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Try the demo', exact: true })
      .waitFor({ timeout: 60_000 });
    // From a page of the same site that runs no app, so nothing touches
    // the copy behind this
    await page.goto('/data-file-index.txt');
    await seedPreviousEngineBudget(page, { isLastOpened: true });
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
      page
        .getByRole('grid', { name: 'Budget files' })
        .getByText(SEEDED_BUDGET_NAME),
    ).toBeVisible();
    // Still there to be seen, and it names the budget although no list
    // was loaded when it was raised
    const namedBudget = report.getByText(
      `Moving budget "${SEEDED_BUDGET_NAME}"`,
    );
    await expect(namedBudget).toBeVisible();
    await expect.poll(() => isShownToTheUser(namedBudget)).toBe(true);
  });

  test('a second tab cannot open the same budget at the same time', async ({
    browser,
  }) => {
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
    page = await browser.newPage();
    // The IndexedDB fallback, which keeps a budget in memory between saves
    await page.goto('/?storage=memory-idb');
    await page.evaluate(
      flag => sessionStorage.setItem(flag, '1'),
      MANUAL_STORAGE_BACKEND_FLAG,
    );
    await new ConfigurationPage(page).createTestFile();
    const accountPage = await new Navigation(page).goToAccountPage(
      'Ally Savings',
    );
    await accountPage.waitFor();

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

// What a tab hears when another one stores a different engine
async function announceEngineChange(page: Page) {
  await page.evaluate(key => {
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, STORAGE_BACKEND_KEY);
}

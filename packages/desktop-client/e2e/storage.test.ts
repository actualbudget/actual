import type { Page } from '@playwright/test';

import { addE2EInitScripts, expect, test } from './fixtures';
import { AccountPage } from './page-models/account-page';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import { inspectStorage } from './page-models/storage-inspector';
import type { StorageSnapshot } from './page-models/storage-inspector';

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
async function seedPreviousEngineBudget(page: Page) {
  await page.evaluate(
    async ({ id, name }) => {
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
      const files = actual.transaction(['files'], 'readwrite');
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
    { id: SEEDED_BUDGET_ID, name: SEEDED_BUDGET_NAME },
  );
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
    // Let the app create its IndexedDB schema, then plant the old layout
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Try the demo', exact: true })
      .waitFor({ timeout: 60_000 });
    await seedPreviousEngineBudget(page);

    // The budget is listed and moved into the new storage when opened
    await page.goto('/');
    await page.getByText(SEEDED_BUDGET_NAME).click({ timeout: 60_000 });
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });

    await page.waitForTimeout(PERSIST_WAIT_MS);
    expectNewStorageLayout(await inspectStorage(page));
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
      .toMatch(/already open in another tab/);

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
});

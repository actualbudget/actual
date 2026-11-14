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

// What a tab hears when another one stores a different engine
async function announceEngineChange(page: Page) {
  await page.evaluate(key => {
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, STORAGE_BACKEND_KEY);
}

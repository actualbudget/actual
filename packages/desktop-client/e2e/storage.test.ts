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
// A user agent without "playwright" in it, so the app uses the SharedWorker
// coordinator (leader tab plus followers) instead of a worker per tab
const CHROME_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

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

// The dialog that asks before a budget is moved to the new storage
function movePrompt(page: Page) {
  return page.getByTestId('confirm-storage-migration-modal');
}

// Leaves the page with a budget the legacy storage wrote and the
// requested storage chosen for the next load; resolves the balance to
// find again
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
  await page.evaluate(
    ([key, backend]) => localStorage.setItem(key, backend),
    [STORAGE_BACKEND_KEY, requestedBackend],
  );
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

  test('moves a budget created under the legacy storage once the user agrees', async ({
    browser,
  }, testInfo) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    const balance = await createLegacyBudgetThenSwitch(page);

    // Reopening the budget asks first, and nothing moves meanwhile
    await page.goto('/');
    const prompt = movePrompt(page);
    await expect(prompt).toBeVisible({ timeout: 60_000 });
    const downloading = page.waitForEvent('download');
    await prompt.getByRole('button', { name: 'Download backup' }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-.*\.zip$/);
    const backupPath = testInfo.outputPath('backup.zip');
    await download.saveAs(backupPath);
    await expect(prompt.getByText('Backup downloaded')).toBeVisible();
    expectStorageLayout(await inspectStorage(page), 'legacy');

    await prompt.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expectAllySavingsBalance(page, balance);
    await expect(async () => {
      expectStorageLayout(await inspectStorage(page), 'new');
    }).toPass({ timeout: 10_000 });

    // The backup is a whole budget: a browser that has nothing imports it
    const emptyBrowser = await browser.newContext();
    await addE2EInitScripts(emptyBrowser);
    const restored = await emptyBrowser.newPage();
    await restored.goto('/');
    await new ConfigurationPage(restored).importBudget('Actual', backupPath);
    await expect(restored.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expectAllySavingsBalance(restored, balance);
    await emptyBrowser.close();
  });

  test('keeps a budget on the previous storage when the move is put off', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    const balance = await createLegacyBudgetThenSwitch(page);

    await page.goto('/');
    const prompt = movePrompt(page);
    await expect(prompt).toBeVisible({ timeout: 60_000 });
    // Takes the browser back to the previous engine and opens the budget
    // there, with nothing moved
    const reloaded = page.waitForEvent('load', { timeout: 60_000 });
    await prompt.getByRole('button', { name: 'Not now' }).click();
    await reloaded;
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expect(prompt).toBeHidden();
    await expectAllySavingsBalance(page, balance);
    expectStorageLayout(await inspectStorage(page), 'legacy');

    // The setting agrees: the new engine is off again
    const settingsPage = await new Navigation(page).goToSettingsPage();
    await settingsPage.goToSection('Experimental');
    await expect(
      page.getByRole('checkbox', { name: 'New browser storage engine' }),
    ).not.toBeChecked();
  });

  test('offers no way around the move once another budget is on the new storage', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    await createLegacyBudgetThenSwitch(page);

    // A second budget is made on the new storage, which the previous
    // engine could not read
    await page.goto('/');
    const prompt = movePrompt(page);
    await expect(prompt).toBeVisible({ timeout: 60_000 });
    await expect(prompt.getByRole('button', { name: 'Not now' })).toBeVisible();
    await prompt.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Create new file' }).click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    // Back to the list of files by way of a fresh start, which opens no
    // budget once the backend has closed this one
    await page.evaluate(() => window.$send('close-budget'));
    await page.reload();

    // So the first budget can only be moved, or left closed
    await page.getByText('Test Budget').click({ timeout: 60_000 });
    await expect(prompt).toBeVisible({ timeout: 60_000 });
    await expect(prompt.getByText('already use the new storage')).toBeVisible();
    await expect(prompt.getByRole('button', { name: 'Not now' })).toBeHidden();
    await prompt.getByRole('button', { name: 'Cancel' }).click();
    await expect(prompt).toBeHidden();
    const testBudget = (await inspectStorage(page)).sqliteRows.find(row =>
      row.filepath.includes('_test-budget'),
    );
    expect(testBudget).toEqual(
      expect.objectContaining({ storage: undefined, hasBytes: false }),
    );
  });

  test('moves a budget once the user agrees where tabs share one backend', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    // Without "playwright" in the user agent the app runs its SharedWorker
    // coordinator, as desktop browsers do
    const context = await browser.newContext({ userAgent: CHROME_USER_AGENT });
    await addE2EInitScripts(context);
    const first = await context.newPage();
    const balance = await createLegacyBudgetThenSwitch(first);
    // The coordinator goes with its last page, so the next one starts a
    // backend on the requested storage
    await first.close();

    page = await context.newPage();
    await page.goto('/');
    const prompt = movePrompt(page);
    await expect(prompt).toBeVisible({ timeout: 60_000 });
    // The same tab asks its backend for the budget a second time
    await prompt.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expectAllySavingsBalance(page, balance);
    await page.close();
    await context.close();
  });

  test('goes back to the previous storage where tabs share one backend', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    const context = await browser.newContext({ userAgent: CHROME_USER_AGENT });
    await addE2EInitScripts(context);
    const first = await context.newPage();
    const balance = await createLegacyBudgetThenSwitch(first);
    await first.close();

    page = await context.newPage();
    await page.goto('/');
    // Keeps the fixture from choosing the storage again on the reload
    await page.evaluate(
      flag => sessionStorage.setItem(flag, '1'),
      MANUAL_STORAGE_BACKEND_FLAG,
    );
    const prompt = movePrompt(page);
    await expect(prompt).toBeVisible({ timeout: 60_000 });
    // The tab reloads, and its backend has to start on the other engine
    const reloaded = page.waitForEvent('load', { timeout: 60_000 });
    await prompt.getByRole('button', { name: 'Not now' }).click();
    await reloaded;
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expectAllySavingsBalance(page, balance);
    expectStorageLayout(await inspectStorage(page), 'legacy');
    await page.close();
    await context.close();
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
    // The app comes back on the settings address with no budget open,
    // and the prompt outlasts its move to the list of files
    await movePrompt(page).getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByTestId('budget-table')).toBeVisible({
      timeout: 60_000,
    });
    await expectAllySavingsBalance(page, balance);
    await new Navigation(page).goToSettingsPage();
    await settingsPage.goToSection('Experimental');
    await expect(toggle).toBeChecked();
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

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

async function readAllySavingsBalance(page: Page) {
  const accountPage = await new Navigation(page).goToAccountPage(
    'Ally Savings',
  );
  await accountPage.waitFor();
  return (await accountPage.accountBalance.textContent())?.trim();
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
    expect(await readAllySavingsBalance(page)).toBe(balance);

    await page.waitForTimeout(PERSIST_WAIT_MS);
    expectStorageLayout(await inspectStorage(page), 'new');
  });

  test('switches back to the legacy storage from the settings', async ({
    browser,
  }) => {
    test.skip(!usesNewStorage, 'only meaningful for the new storage');

    page = await browser.newPage();
    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    const balance = await readAllySavingsBalance(page);
    await page.evaluate(flag => {
      sessionStorage.setItem(flag, '1');
      localStorage.setItem('devEnableStoragePrefs', 'true');
    }, MANUAL_STORAGE_BACKEND_FLAG);

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
    expect(await readAllySavingsBalance(page)).toBe(balance);
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
});

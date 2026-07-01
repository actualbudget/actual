import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

// Not a strict performance budget (timings vary by machine/load) - a smoke
// check to catch a gross regression, and a place to compare export/import
// duration across dependency changes to the zip layer (packages/loot-core/
// src/server/util/zip.ts, which cloud-storage.ts's exportBuffer/
// importBuffer route through).
const GENEROUS_UPPER_BOUND_MS = 30_000;

/**
 * Populates the currently-open (empty) budget with a large, randomly
 * generated data set entirely through already-registered server handlers
 * (`window.$send`, the same mechanism `e2e/budget.test.ts` uses to reach
 * into the app without a UI trigger) - no production code is touched, and
 * nothing here persists beyond the ephemeral browser context it runs in.
 */
async function createLargeRandomBudget(
  page: Page,
  sizes: {
    accounts: number;
    payees: number;
    categoryGroups: number;
    categories: number;
    months: number;
    transactions: number;
  },
) {
  await page.evaluate(async sizes => {
    const $send = (
      window as unknown as {
        $send: (type: string, args?: unknown) => Promise<unknown>;
      }
    ).$send;

    const categoriesPerGroup = Math.round(
      sizes.categories / sizes.categoryGroups,
    );

    const categoryIds: string[] = [];
    for (let g = 0; g < sizes.categoryGroups; g++) {
      const groupId = (await $send('category-group-create', {
        name: `Category Group ${g + 1}`,
      })) as string;

      for (let c = 0; c < categoriesPerGroup; c++) {
        const categoryId = (await $send('category-create', {
          name: `Category ${g + 1}.${c + 1}`,
          groupId,
        })) as string;
        categoryIds.push(categoryId);
      }
    }

    const accountIds: string[] = [];
    for (let a = 0; a < sizes.accounts; a++) {
      const accountId = (await $send('account-create', {
        name: `Account ${a + 1}`,
      })) as string;
      accountIds.push(accountId);
    }

    const payees = Array.from({ length: sizes.payees }, (_, i) => ({
      id: crypto.randomUUID(),
      name: `Payee ${i + 1}`,
    }));
    await $send('payees-batch-change', { added: payees });

    const dayMs = 24 * 60 * 60 * 1000;
    const rangeMs = sizes.months * 30 * dayMs;
    const now = Date.now();

    const transactions = Array.from({ length: sizes.transactions }, (_, i) => {
      const date = new Date(now - Math.floor(Math.random() * rangeMs));
      return {
        account: accountIds[i % accountIds.length],
        payee: payees[Math.floor(Math.random() * payees.length)].id,
        category: categoryIds[Math.floor(Math.random() * categoryIds.length)],
        amount: Math.floor(Math.random() * 20000) - 10000,
        date: date.toISOString().slice(0, 10),
        notes: `Generated transaction ${i + 1}`,
      };
    });

    await $send('transactions-batch-update', {
      added: transactions,
      fastMode: true,
    });
  }, sizes);
}

test.describe('Export/import performance', () => {
  test('times a full export + import round trip of the test budget', async ({
    browser,
  }) => {
    const exportedFilePath = path.join(
      os.tmpdir(),
      `zip-perf-export-${Date.now()}.zip`,
    );

    let exportMs: number;
    const exportContext = await browser.newContext();
    try {
      const exportPage: Page = await exportContext.newPage();
      const exportConfigurationPage = new ConfigurationPage(exportPage);

      await exportPage.goto('/');
      await exportConfigurationPage.createTestFile();

      const navigation = new Navigation(exportPage);
      const settingsPage = await navigation.goToSettingsPage();

      const exportStart = performance.now();
      const downloadPromise = exportPage.waitForEvent('download');
      await settingsPage.exportData();
      const download = await downloadPromise;
      exportMs = performance.now() - exportStart;

      await download.saveAs(exportedFilePath);
    } finally {
      await exportContext.close();
    }

    let importMs: number;
    const importContext = await browser.newContext();
    try {
      const importPage: Page = await importContext.newPage();
      const importConfigurationPage = new ConfigurationPage(importPage);

      await importPage.goto('/');
      await importConfigurationPage.clickOnNoServer();

      const importStart = performance.now();
      const budgetPage = await importConfigurationPage.importBudget(
        'Actual',
        exportedFilePath,
      );
      await budgetPage.waitFor({ timeout: GENEROUS_UPPER_BOUND_MS });
      importMs = performance.now() - importStart;
    } finally {
      await importContext.close();
      fs.unlinkSync(exportedFilePath);
    }

    // eslint-disable-next-line no-console
    console.log(
      `[export-import-performance] default-budget export=${exportMs.toFixed(1)}ms import=${importMs.toFixed(1)}ms`,
    );
    test
      .info()
      .annotations.push(
        { type: 'default-budget-export-ms', description: exportMs.toFixed(1) },
        { type: 'default-budget-import-ms', description: importMs.toFixed(1) },
      );

    expect(exportMs).toBeLessThan(GENEROUS_UPPER_BOUND_MS);
    expect(importMs).toBeLessThan(GENEROUS_UPPER_BOUND_MS);
  });

  test('times a full export + import round trip of a large randomly-generated budget', async ({
    browser,
  }) => {
    // Generating ~5000 records through the app's real handlers (rather than
    // writing to the DB directly) takes a while - this budget only bounds
    // setup, not the actual export/import measurement asserted below.
    test.setTimeout(180_000);

    const exportedFilePath = path.join(
      os.tmpdir(),
      `zip-perf-export-${Date.now()}.zip`,
    );

    let exportMs: number;
    const exportContext = await browser.newContext();
    try {
      const exportPage: Page = await exportContext.newPage();
      const exportConfigurationPage = new ConfigurationPage(exportPage);

      await exportPage.goto('/');
      await exportConfigurationPage.clickOnNoServer();
      await exportConfigurationPage.startFresh();
      await createLargeRandomBudget(exportPage, {
        accounts: 35,
        payees: 1100,
        categoryGroups: 15,
        categories: 80,
        months: 36,
        transactions: 4000,
      });

      const navigation = new Navigation(exportPage);
      const settingsPage = await navigation.goToSettingsPage();

      const exportStart = performance.now();
      const downloadPromise = exportPage.waitForEvent('download');
      await settingsPage.exportData();
      const download = await downloadPromise;
      exportMs = performance.now() - exportStart;

      await download.saveAs(exportedFilePath);
    } finally {
      await exportContext.close();
    }

    let importMs: number;
    const importContext = await browser.newContext();
    try {
      const importPage: Page = await importContext.newPage();
      const importConfigurationPage = new ConfigurationPage(importPage);

      await importPage.goto('/');
      await importConfigurationPage.clickOnNoServer();

      const importStart = performance.now();
      const budgetPage = await importConfigurationPage.importBudget(
        'Actual',
        exportedFilePath,
      );
      await budgetPage.waitFor({ timeout: GENEROUS_UPPER_BOUND_MS });
      importMs = performance.now() - importStart;
    } finally {
      await importContext.close();
      fs.unlinkSync(exportedFilePath);
    }

    // eslint-disable-next-line no-console
    console.log(
      `[export-import-performance] large-budget export=${exportMs.toFixed(1)}ms import=${importMs.toFixed(1)}ms`,
    );
    test
      .info()
      .annotations.push(
        { type: 'large-budget-export-ms', description: exportMs.toFixed(1) },
        { type: 'large-budget-import-ms', description: importMs.toFixed(1) },
      );

    expect(exportMs).toBeLessThan(GENEROUS_UPPER_BOUND_MS);
    expect(importMs).toBeLessThan(GENEROUS_UPPER_BOUND_MS);
  });
});

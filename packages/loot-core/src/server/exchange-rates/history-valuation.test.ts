import type { MockInstance } from 'vitest';

import * as network from '#platform/server/fetch';
import * as fs from '#platform/server/fs';
import { createAllBudgets } from '#server/budget/base';
import { stopFxDayWatch } from '#server/budget/fx-valuation';
import { writePocketBudgetCell } from '#server/budget/pockets';
import { reservationDetails } from '#server/budget/reservations';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { exchangeRateModel } from '#server/models';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';
import { getFxImpact } from '#server/reports/fx-impact';
import * as sheet from '#server/sheet';
import { exchangeRateSpec } from '#server/sync/coupled-cells';
import { undo } from '#server/undo';
import { sheetForMonth } from '#shared/months';

import { computeEntryPair, exchangeRateId, app as rates } from './app';
import { captureFxContext, startFxContext } from './context';
import { importCommit, importPreview, importPreviewBegin } from './history';
import { historyExport, historyPage, removeFetched } from './history-reads';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));
let read: MockInstance<typeof fs.readFile>;
const cell = (month: string, name: string) =>
  sheet.getCellValue(sheetForMonth(month), name);
const transactions = () =>
  db.runQuery<db.DbTransaction>(
    'SELECT * FROM transactions ORDER BY id',
    [],
    true,
  );
async function settle(month: string, expected: number) {
  await vi.waitFor(() => expect(cell(month, 'fx-changes')).toBe(expected));
  await sheet.waitOnSpreadsheet();
}
async function importRow(rate: string, date: string, quote = 'JPY') {
  read.mockResolvedValue(
    new TextEncoder().encode(
      `quote_currency,rate,kind,date\n${quote},${rate},dated,${date}`,
    ),
  );
  const begin = await importPreviewBegin();
  if (begin.status !== 'ok') throw new Error('preview unavailable');
  expect(
    await importPreview({ operation: begin.operation, filepath: '/rates.csv' }),
  ).toMatchObject({ status: 'ok' });
  expect(await importCommit({ ...begin, policy: 'replace' })).toMatchObject({
    status: 'ok',
    written: 1,
  });
}
beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  global.currentDay = '2026-04-02';
  global.currentMonth = '2026-04';
  onTestFinished(() => {
    global.currentDay = null;
    global.currentMonth = null;
    stopFxDayWatch();
  });
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'USD',
      precision: 2,
    }),
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = 'envelope';
  await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
  await db.insertCategoryGroup({ id: 'income', name: 'Income', is_income: 1 });
  await db.insertCategory({
    id: 'travel',
    name: 'Travel',
    cat_group: 'expenses',
  });
  await db.insertCategory({
    id: 'salary',
    name: 'Salary',
    cat_group: 'income',
    is_income: 1,
  });
  await db.insertAccount({ id: 'jpy', name: 'Yen', currency: 'JPY' });
  await rates.handlers['exchange-rates/save']({
    quoteCurrency: 'JPY',
    rate: '150',
    // The January close needs its own daily rate.
    date: '2026-01-31',
  });
  await db.insertTransaction({
    id: 'income',
    account: 'jpy',
    date: '2026-01-05',
    amount: 10000,
    transaction_amount: 15000,
    category: 'salary',
  });
  await createAllBudgets();
  await sheet.waitOnSpreadsheet();
  onTestFinished(startFxContext());
  read = vi.spyOn(fs, 'readFile');
  onTestFinished(() => {
    read.mockRestore();
  });
});

it('values month ends at their daily fallbacks, with reports and undo, preserving every posted row', async () => {
  const before = transactions();
  for (const month of ['2026-01', '2026-02', '2026-03']) {
    expect(cell(month, 'fx-changes')).toBe(0);
  }
  await importRow('125', '2026-02-28');
  await settle('2026-02', 2000);
  expect(cell('2026-03', 'fx-changes')).toBe(0);
  const report = await getFxImpact({
    startMonth: '2026-02',
    endMonth: '2026-02',
    accountIds: null,
    currencies: null,
  });
  expect(report.months[0].total.unrealized).toBe(2000);
  expect(transactions()).toEqual(before);
  await importRow('120', '2026-02-28');
  await settle('2026-02', 2500);
  expect(cell('2026-03', 'fx-changes')).toBe(0);
  expect(transactions()).toEqual(before);
  await importRow('100', '2026-03-31');
  await settle('2026-03', 2500);
  expect(cell('2026-04', 'fx-changes')).toBe(0);
  expect(transactions()).toEqual(before);
  await undo();
  await settle('2026-03', 0);
  expect(cell('2026-02', 'fx-changes')).toBe(2500);
  expect(transactions()).toEqual(before);
});

it('ignores a fallback dated after the current close date', async () => {
  const before = transactions();
  global.currentDay = '2026-03-20';
  global.currentMonth = '2026-03';
  await importRow('120', '2026-02-28');
  await settle('2026-02', 2500);
  await importRow('100', '2026-03-31');
  await new Promise(resolve => setTimeout(resolve, 150));
  await sheet.waitOnSpreadsheet();
  expect(cell('2026-03', 'fx-changes')).toBe(0);
  expect(transactions()).toEqual(before);
});

it('revalues a 6000 JPY reservation to 4800 and free holdings to 7200 without recapturing its frozen pair', async () => {
  await db.insert('category_pockets', {
    id: 'travelJpy',
    category: 'travel',
    kind: 'foreign',
    encoding: 'JPY.0',
    tombstone: 0,
  });
  expect(
    await writePocketBudgetCell({
      lane: 'travelJpy',
      month: '2026-01',
      pair: {
        native: 6000,
        base: 4000,
        encoding: 'JPY.0',
        captureDate: '2026-01-31',
      },
    }),
  ).toEqual({ status: 'ok' });
  await createAllBudgets();
  await sheet.waitOnSpreadsheet();
  const frozen = db.firstSync<{ base_amount: number; budget_pair: string }>(
    "SELECT base_amount, budget_pair FROM pocket_budgets WHERE id = '202601-travelJpy'",
  );
  expect(frozen?.base_amount).toBe(4000);
  const before = transactions();
  const beforeToBudget = Number(cell('2026-02', 'to-budget'));
  await importRow('125', '2026-02-28');
  await settle('2026-02', 2000);
  expect(
    reservationDetails('2026-02').find(row => row.currency === 'JPY'),
  ).toMatchObject({
    reserved: 6000,
    marketHoldings: 12000,
    pocketTotal: 4800,
    marketUnreserved: 7200,
  });
  expect(Number(cell('2026-02', 'to-budget')) - beforeToBudget).toBe(1200);
  expect(
    db.firstSync(
      "SELECT base_amount, budget_pair FROM pocket_budgets WHERE id = '202601-travelJpy'",
    ),
  ).toEqual(frozen);
  expect(transactions()).toEqual(before);
});

it('uses an imported 3dp KWD fallback for an entry on its day', async () => {
  await importRow('0.307', '2026-02-28', 'KWD');
  expect(
    await computeEntryPair({
      quoteCurrency: 'KWD',
      nativePrecision: 3,
      date: '2026-02-28',
      nativeAmount: 1000,
    }),
  ).toMatchObject({ status: 'ok', baseAmount: 326, nativeAmount: 1000 });
});

it('keeps import, export, paging and fetched removal entirely database-only', async () => {
  const before = transactions();
  // A fetched row as another device's provider would write it.
  const timestamp = '2026-02-27T00:00:00.000Z';
  const fetched = exchangeRateModel.validate({
    id: exchangeRateId('USD', 'JPY', 'plugin:fxtest', 'fetched', timestamp),
    base_currency: 'USD',
    quote_currency: 'JPY',
    rate: '125',
    kind: 'fetched',
    source: 'plugin:fxtest',
    timestamp,
    tombstone: 0,
  });
  await runMutator(() =>
    db.insert('exchange_rates', {
      ...fetched,
      spec: exchangeRateSpec(fetched),
    }),
  );
  const fetch = vi.spyOn(network, 'fetchQuiet');
  onTestFinished(() => {
    fetch.mockRestore();
  });
  await importRow('125', '2026-02-28');
  expect(await historyExport({})).toMatchObject({ status: 'ok', rowCount: 3 });
  const page = await historyPage({ kind: 'fetched' });
  if (page.status !== 'ok' || page.rows.length !== 1) {
    throw new Error('fetched history missing');
  }
  const captured = await captureFxContext();
  if (!captured) throw new Error('context unavailable');
  const row = page.rows[0];
  expect(
    await removeFetched({
      id: row.id,
      context: captured.context,
      reviewed: {
        rate: row.rate,
        source: row.source,
        timestamp: row.timestamp,
      },
    }),
  ).toEqual({ status: 'removed' });
  expect(fetch).not.toHaveBeenCalled();
  expect(transactions()).toEqual(before);
});

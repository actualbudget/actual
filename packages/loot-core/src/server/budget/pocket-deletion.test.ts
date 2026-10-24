import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Timestamp } from '@actual-app/crdt';

import * as fs from '#platform/server/fs';
import * as sqlite from '#platform/server/sqlite';
import { installAPI } from '#server/api';
import { aqlQuery } from '#server/aql';
import { exportBuffer, importBuffer } from '#server/cloud-storage';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';
import { applyMessages, setSyncingMode } from '#server/sync';
import type { Message } from '#server/sync';
import { amountPair } from '#server/sync/coupled-cells';
import { deserializeValue } from '#server/sync/serialization';
import { clearUndo, undo } from '#server/undo';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { ServerHandlers } from '#types/server-handlers';

import * as actions from './actions';
import { app as budgetApp } from './app';
import { createAllBudgets, setType } from './base';
import { refreshFxChanges, stopFxDayWatch } from './fx-valuation';
import { readCategoryPockets } from './pocket-readers';
import {
  createBaseLane,
  rebuildSlotResolution,
  retireLane,
  slotFor,
  writePocketBudgetCell,
} from './pockets';
import { reservationDetails } from './reservations';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

// MC-10.6 deletion and repair, through the registered handlers. Every
// fixture month is past (today 2026-06-15) unless stated.
const clock = {
  set today(day: string) {
    global.currentDay = day;
    global.currentMonth = day.slice(0, 7);
  },
};

const handlers = budgetApp.handlers;
const api = installAPI(handlers as unknown as ServerHandlers);

const remote = (
  dataset: string,
  row: string,
  column: string,
  value: string | number | null,
): Message => ({
  dataset,
  row,
  column,
  value,
  timestamp: Timestamp.send()!,
});

/** A lane with a known id, as another device created it. */
async function lane(
  id: string,
  category: string,
  encoding: string,
  kind: 'base' | 'foreign' = 'foreign',
  generation?: number,
) {
  await applyMessages([
    remote('category_pockets', id, 'category', category),
    remote('category_pockets', id, 'kind', kind),
    remote('category_pockets', id, 'encoding', encoding),
    ...(generation !== undefined
      ? [remote('category_pockets', id, 'generation', generation)]
      : []),
    remote('category_pockets', id, 'tombstone', 0),
  ]);
}

async function assign(
  laneId: string,
  month: string,
  native: number,
  base: number | null,
  captureDate: string,
  encoding: string,
) {
  expect(
    await writePocketBudgetCell({
      lane: laneId,
      month,
      pair: { native, base, encoding, captureDate },
    }),
  ).toEqual({ status: 'ok' });
}

const remoteCell = (laneId: string, month: string, pair: string) => {
  const id = `${month.replace('-', '')}-${laneId}`;
  return applyMessages([
    remote('pocket_budgets', id, 'month', Number(month.replace('-', ''))),
    remote('pocket_budgets', id, 'lane', laneId),
    remote('pocket_budgets', id, 'budget_pair', pair),
  ]);
};

/** A row another device wrote, cell by cell, without this device's guards. */
const remoteRow = (
  id: string,
  fields: Record<string, string | number | null>,
) =>
  applyMessages(
    Object.entries(fields).map(([column, v]) =>
      remote('transactions', id, column, v),
    ),
  );

let rowId = 0;
async function row(
  account: string,
  date: string,
  base: number,
  native: number | null,
  category: string | null,
) {
  const id = `row${rowId++}`;
  await db.insertTransaction({
    id,
    account,
    date,
    amount: base,
    ...(native !== null && { transaction_amount: native }),
    category,
  });
  return id;
}
const income = (
  account: string,
  date: string,
  base: number,
  native: number | null,
) => row(account, date, base, native, 'salary');

async function standing(currency: string, rate: string, date: string) {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency: currency,
    rate,
    kind: 'standing',
    date,
    replace: true,
  });
}

async function refresh() {
  await createAllBudgets();
  await refreshFxChanges();
  await sheet.waitOnSpreadsheet();
}

const value = (month: string, name: string) =>
  sheet.getCellValue(monthUtils.sheetForMonth(month), name);
const toBudget = (month: string) => Number(value(month, 'to-budget'));

/** A category's base slot as the budget sheet shows it. */
const base = (month: string, category: string) => ({
  budgeted: value(month, `budget-${category}`),
  spent: value(month, `sum-amount-${category}`),
  balance: value(month, `leftover-${category}`),
});

function currency(month: string, code: string) {
  const found = reservationDetails(month).find(c => c.currency === code);
  if (!found) throw new Error(`no ${code} reservation in ${month}`);
  return found;
}

const MONTHS = ['2026-01', '2026-02', '2026-03'];

/**
 * The figures every MC-10 deletion keeps (work order invariants): To
 * Budget, fx-changes, reservation-changes, last month's overspending, the
 * sum of category and base lane leftovers, every currency's P and Pincl,
 * and every foreign lane's native leftover and allocated value.
 */
function figures() {
  return MONTHS.map(month => ({
    month,
    toBudget: value(month, 'to-budget'),
    fx: value(month, 'fx-changes'),
    reserved: value(month, 'reservation-changes'),
    overspent: value(month, 'last-month-overspent'),
    leftovers: value(month, 'total-leftover'),
    budgeted: value(month, 'total-budgeted'),
    currencies: reservationDetails(month).map(c => ({
      currency: c.currency,
      pocketTotal: c.pocketTotal,
      includedReservation: c.includedReservation,
      // A destination lane created empty holds nothing.
      lanes: c.lanes
        .filter(l => l.balance !== 0 || l.balanceBase !== 0)
        .map(l => ({
          laneId: l.laneId,
          balance: l.balance,
          value: l.balanceBase,
        }))
        .sort((a, b) => (a.laneId < b.laneId ? -1 : 1)),
    })),
  }));
}

const cell = (laneId: string, month: string) =>
  db.firstSync<{
    budget_pair: string | null;
    amount: number | null;
    amount_encoding: string | null;
    base_amount: number | null;
    carryover: number | null;
  }>(
    `SELECT budget_pair, amount, amount_encoding, base_amount, carryover
       FROM pocket_budgets WHERE id = ?`,
    [`${month.replace('-', '')}-${laneId}`],
  );
const zeroBudget = (category: string, month: string) =>
  db.firstSync<{ amount: number | null; carryover: number | null }>(
    'SELECT amount, carryover FROM zero_budgets WHERE id = ?',
    [`${month.replace('-', '')}-${category}`],
  );
const count = (table: string) =>
  db.firstSync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)!.n;
const retirement = (laneId: string) =>
  db.firstSync<{ owner: string; tombstone: number }>(
    'SELECT owner, tombstone FROM slot_retirements WHERE id = ?',
    [laneId],
  );
const resolution = (laneId: string) =>
  db.firstSync<{
    effective_category: string | null;
    effective_owner: string | null;
    status: string;
    active: number;
  }>(
    `SELECT effective_category, effective_owner, status, active
       FROM slot_resolution WHERE lane = ?`,
    [laneId],
  );
const laneOf = (id: string) =>
  db.firstSync<{ lane: string | null }>(
    'SELECT lane FROM v_transaction_lanes WHERE id = ?',
    [id],
  )!.lane;
const lanesOf = (category: string, kind: 'base' | 'foreign') =>
  db.runQuery<{ id: string; encoding: string; generation: number | null }>(
    `SELECT id, encoding, generation FROM category_pockets
       WHERE category = ? AND kind = ? AND tombstone = 0 ORDER BY id`,
    [category, kind],
    true,
  );

async function shownCategory(id: string) {
  const { data } = await aqlQuery(
    q('transactions').filter({ id }).select(['id', 'category']),
  );
  return (data as Array<{ category: string | null }>)[0]?.category ?? null;
}

async function slot(month: string, category: string, pocketId: string) {
  const entry = (await readCategoryPockets(month)).get(category);
  const found = entry?.pockets.find(p => p.id === pocketId);
  if (!found) throw new Error(`no slot ${pocketId} in ${category}`);
  return found;
}

async function setup() {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
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
}

beforeEach(async () => {
  setSyncingMode('offline');
  clock.today = '2026-06-15';
  rowId = 0;
  await setup();
  for (const account of [
    { id: 'usd', name: 'Checking' },
    { id: 'jpy', name: 'Yen', currency: 'JPY' },
    { id: 'iqd3', name: 'Iraqi dinar 3', currency: 'IQD' },
    { id: 'iqd0', name: 'Iraqi dinar 0', currency: 'IQD' },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
  await applyMessages([
    remote('accounts', 'iqd3', 'encoding', 'IQD.3'),
    remote('accounts', 'iqd0', 'encoding', 'IQD.0'),
  ]);
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategoryGroup({ id: 'group2', name: 'Group 2' });
  await db.insertCategoryGroup({
    id: 'incomeGroup',
    name: 'Income',
    is_income: 1,
  });
  for (const id of ['travel', 'shop']) {
    await db.insertCategory({ id, name: id, cat_group: 'group' });
  }
  await db.insertCategory({ id: 'food', name: 'food', cat_group: 'group2' });
  await db.insertCategory({
    id: 'salary',
    name: 'Salary',
    cat_group: 'incomeGroup',
    is_income: 1,
  });
  clearUndo();
});

afterEach(() => {
  stopFxDayWatch();
  setSyncingMode('disabled');
  global.currentDay = null;
  global.currentMonth = null;
});

/** The whole message log, applied to a fresh database. */
async function replayLog(order: 'forward' | 'reverse') {
  const log = db
    .runQuery<{
      timestamp: string;
      dataset: string;
      row: string;
      column: string;
      value: string;
    }>('SELECT * FROM messages_crdt ORDER BY timestamp', [], true)
    .map(message => ({
      ...message,
      timestamp: Timestamp.parse(message.timestamp)!,
      value: deserializeValue(message.value),
    }));
  stopFxDayWatch();
  await setup();
  if (order === 'forward') {
    await applyMessages(log);
    return;
  }
  // The MC-10.5 bounded harness accommodation: each upstream zero_budgets
  // row arrives whole (its handler needs the row's month with its
  // category); every other message arrives one at a time, in reverse.
  const rows = new Map<string, typeof log>();
  for (const message of log) {
    const key =
      message.dataset === 'zero_budgets'
        ? `${message.dataset}:${message.row}`
        : `${message.timestamp.toString()}`;
    rows.set(key, [...(rows.get(key) ?? []), message]);
  }
  for (const batch of [...rows.values()].reverse()) {
    await applyMessages(batch);
  }
}

/** A cold reload: resolution rebuilt from synced tables, sheet rebuilt. */
async function reload() {
  db.runQuery('DELETE FROM slot_resolution');
  rebuildSlotResolution();
  stopFxDayWatch();
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = 'envelope';
  await refresh();
}

describe('ordinary budgets are unchanged', () => {
  it('keeps every cell of a budget without pockets', async () => {
    await income('usd', '2026-01-05', 50000, null);
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 10000,
    });
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 2000,
    });
    await row('usd', '2026-01-10', -15000, null, 'food');
    await row('usd', '2026-01-11', -5000, null, 'shop');
    await row('usd', '2026-02-11', -1000, null, 'travel');
    // Carry edits apply to created months.
    await refresh();
    await handlers['budget/set-carryover']({
      startMonth: '2026-01',
      category: 'shop',
      flag: true,
    });
    await refresh();
    // Food -50.00 resets; Shop -30.00 rolls over; Travel -10.00 resets.
    expect(base('2026-01', 'food')).toEqual({
      budgeted: 10000,
      spent: -15000,
      balance: -5000,
    });
    expect(base('2026-02', 'shop').balance).toBe(-3000);
    expect(value('2026-02', 'last-month-overspent')).toBe(-5000);
    expect(value('2026-03', 'last-month-overspent')).toBe(-1000);
    expect(toBudget('2026-01')).toBe(38000);
    expect(toBudget('2026-02')).toBe(33000);
    expect(toBudget('2026-03')).toBe(32000);
    for (const month of MONTHS) {
      for (const category of ['food', 'shop', 'travel']) {
        expect(value(month, `carry-adjust-${category}`)).toBe(0);
      }
      expect(value(month, 'carry-adjust-total')).toBe(0);
    }
  });

  it('deletes an unaffected category exactly as upstream', async () => {
    await income('usd', '2026-01-05', 50000, null);
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 2000,
    });
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 3000,
    });
    const spent = await row('usd', '2026-01-10', -500, null, 'shop');
    await refresh();
    expect(await handlers['must-category-transfer']({ id: 'shop' })).toBe(true);
    expect(await handlers['must-category-transfer']({ id: 'travel' })).toBe(
      false,
    );
    const messages = count('messages_crdt');
    await handlers['category-delete']({ id: 'shop', transferId: 'food' });
    await refresh();
    // doTransfer adds Shop's budget to Food; the mapping forwards its rows.
    expect(zeroBudget('food', '2026-01')?.amount).toBe(5000);
    expect(await shownCategory(spent)).toBe('food');
    // Only upstream's tables are written: budgets, the mapping and the
    // category, never a lane or retirement.
    const written = db
      .runQuery<{ dataset: string }>(
        'SELECT dataset FROM messages_crdt ORDER BY timestamp',
        [],
        true,
      )
      .slice(messages)
      .map(r => r.dataset);
    expect([...new Set(written)].sort()).toEqual([
      'categories',
      'category_mapping',
      'zero_budgets',
    ]);
    expect(count('category_pockets')).toBe(0);
    expect(count('slot_retirements')).toBe(0);
    expect(toBudget('2026-01')).toBe(45000);

    await undo();
    await refresh();
    expect(zeroBudget('food', '2026-01')?.amount).toBe(3000);
    expect(await shownCategory(spent)).toBe('shop');
    expect(toBudget('2026-01')).toBe(45000);
  });

  it('deletes an unaffected group exactly as upstream', async () => {
    await income('usd', '2026-01-05', 50000, null);
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 3000,
    });
    await refresh();
    await handlers['category-group-delete']({
      id: 'group2',
      transferId: 'shop',
    });
    await refresh();
    expect(zeroBudget('shop', '2026-01')?.amount).toBe(3000);
    expect(count('slot_retirements')).toBe(0);
    expect(toBudget('2026-01')).toBe(47000);
  });
});

describe('separate carry history of base lanes', () => {
  // Seeded through MC-10.1 storage, without the deletion handlers: Travel's
  // category lane (-30.00, rollover off) retired into Food (+100.00).
  async function seeded() {
    await income('usd', '2026-01-05', 50000, null);
    await row('usd', '2026-01-12', -3000, null, 'travel');
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 10000,
    });
    await refresh();
    expect(toBudget('2026-02')).toBe(37000);
    await createBaseLane('travel');
    await retireLane({ lane: 'travel', owner: 'food' });
    await refresh();
  }

  it('resets a retired lane by its own rule under the destination', async () => {
    await seeded();
    expect(base('2026-01', 'food')).toEqual({
      budgeted: 10000,
      spent: -3000,
      balance: 7000,
    });
    expect(base('2026-02', 'food').balance).toBe(10000);
    expect(value('2026-02', 'last-month-overspent')).toBe(-3000);
    expect(toBudget('2026-02')).toBe(37000);
    expect(value('2026-02', 'carry-adjust-food')).toBe(3000);
    expect(value('2026-02', 'carry-adjust-total')).toBe(3000);
  });

  it('charges a reset inherited deficit at month end (MC-10.5 inspection 4)', async () => {
    // Own +10.00 beside an inherited -10.00 with rollover off: January
    // shows 0.00; the inherited deficit resets, so February shows +10.00
    // and To Budget falls by 10.00. Written after the fix (not red evidence).
    await income('usd', '2026-01-05', 50000, null);
    await row('usd', '2026-01-12', -1000, null, 'travel');
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 1000,
    });
    await createBaseLane('travel');
    await retireLane({ lane: 'travel', owner: 'food' });
    await refresh();
    expect(base('2026-01', 'food').balance).toBe(0);
    expect(base('2026-02', 'food').balance).toBe(1000);
    expect(toBudget('2026-02') - toBudget('2026-01')).toBe(-1000);
  });

  it('shows a later base generation in the category cells', async () => {
    await seeded();
    const [next] = lanesOf('travel', 'base');
    await actions.setBudget({
      category: 'travel',
      month: '2026-02',
      amount: 2500,
    });
    await refresh();
    expect(cell(next.id, '2026-02')?.budget_pair).toBe('2500:2500~@2026-02-28');
    expect(base('2026-02', 'travel')).toEqual({
      budgeted: 2500,
      spent: 0,
      balance: 2500,
    });
    expect(base('2026-01', 'travel').budgeted).toBe(0);
    expect(value('2026-02', 'total-budgeted')).toBe(-2500);
    expect(toBudget('2026-02')).toBe(34500);
  });
});

describe('foreign pocket deletion (L1, L2)', () => {
  async function l1() {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 20000, 20000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await lane('foodJpy', 'food', 'JPY.0');
    await assign('travelJpy', '2026-01', 5000, 5000, '2026-01-31', 'JPY.0');
    await assign('foodJpy', '2026-01', 10000, 10000, '2026-01-31', 'JPY.0');
    await row('jpy', '2026-01-12', -8000, -8000, 'travel');
    await refresh();
  }

  it('L1 existing destination, both carry off', async () => {
    await l1();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      holdings: 12000,
      reserved: 7000,
      unreserved: 5000,
      pocketTotal: 7000,
      spentBase: -8000,
      writtenChange: 15000,
    });
    expect(toBudget('2026-01')).toBe(5000);
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: 10000,
      pocketTotal: 10000,
      writtenChange: 3000,
    });
    expect(toBudget('2026-02')).toBe(2000);
    const before = figures();

    await handlers['budget/pocket-delete']({
      id: 'travelJpy',
      transferId: 'food',
    });
    await refresh();

    expect(retirement('travelJpy')).toEqual({ owner: 'foodJpy', tombstone: 0 });
    // The destination's lane in that currency: no lane is created.
    expect(lanesOf('food', 'foreign').map(l => l.id)).toEqual(['foodJpy']);
    expect(figures()).toEqual(before);
    expect(await slot('2026-01', 'food', 'foodJpy')).toMatchObject({
      balance: 7000,
      balanceBase: 7000,
    });
    expect(await slot('2026-02', 'food', 'foodJpy')).toMatchObject({
      balance: 10000,
      balanceBase: 10000,
    });
  });

  it('L2 mixed flags', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await lane('foodJpy', 'food', 'JPY.0');
    await handlers['budget/set-carryover']({
      startMonth: '2026-01',
      category: 'travelJpy',
      flag: true,
    });
    await row('jpy', '2026-01-12', -3000, -3000, 'travel');
    await row('jpy', '2026-01-13', -2000, -2000, 'food');
    await refresh();
    expect(toBudget('2026-01')).toBe(10000);
    expect(currency('2026-02', 'JPY').writtenChange).toBe(2000);
    expect(toBudget('2026-02')).toBe(8000);
    const before = figures();

    await handlers['budget/pocket-delete']({
      id: 'travelJpy',
      transferId: 'food',
    });
    await refresh();

    expect(figures()).toEqual(before);
    expect((await slot('2026-01', 'food', 'foodJpy')).balance).toBe(-5000);
    expect((await slot('2026-02', 'food', 'foodJpy')).balance).toBe(-3000);
    expect(currency('2026-02', 'JPY').writtenChange).toBe(2000);
  });

  it('creates the destination lane in the retired lane encoding and undoes', async () => {
    await l1();
    await handlers['budget/pocket-delete']({
      id: 'foodJpy',
      transferId: 'shop',
    });
    const [created] = lanesOf('shop', 'foreign');
    expect(created).toMatchObject({ encoding: 'JPY.0' });
    expect(retirement('foodJpy')?.owner).toBe(created.id);
    await refresh();
    const after = figures();

    await undo();
    await refresh();
    expect(retirement('foodJpy')?.tombstone).toBe(1);
    expect(lanesOf('shop', 'foreign')).toEqual([]);
    expect(resolution('foodJpy')?.status).toBe('live');
    expect(figures()).toEqual(after);
  });

  it('requires a destination for history and tombstones an empty lane', async () => {
    await l1();
    await expect(
      handlers['budget/pocket-delete']({ id: 'travelJpy' }),
    ).rejects.toThrow('transfer-required');
    await expect(
      handlers['budget/pocket-delete']({
        id: 'travelJpy',
        transferId: 'salary',
      }),
    ).rejects.toThrow();
    await lane('shopJpy', 'shop', 'JPY.0');
    const before = figures();
    await handlers['budget/pocket-delete']({ id: 'shopJpy' });
    await refresh();
    expect(retirement('shopJpy')).toBeNull();
    expect(
      db.firstSync<{ tombstone: number }>(
        'SELECT tombstone FROM category_pockets WHERE id = ?',
        ['shopJpy'],
      )?.tombstone,
    ).toBe(1);
    expect(figures()).toEqual(before);
  });

  it('forwards api/pocket-delete', async () => {
    await l1();
    await api['api/pocket-delete']({
      id: 'travelJpy',
      transferCategoryId: 'food',
    });
    expect(retirement('travelJpy')?.owner).toBe('foodJpy');
  });
});

describe('cross-precision destinations (PR1, PR2)', () => {
  it('PR1 a coarse lane retired into a finer slot', async () => {
    await standing('IQD', '1', '2025-12-01');
    await income('iqd3', '2026-01-05', 100000, 1000000);
    await lane('travelIqd0', 'travel', 'IQD.0');
    await lane('foodIqd3', 'food', 'IQD.3');
    await assign('travelIqd0', '2026-01', -2, -200, '2026-01-31', 'IQD.0');
    await refresh();
    const before = figures();
    await handlers['budget/pocket-delete']({
      id: 'travelIqd0',
      transferId: 'food',
    });
    await refresh();
    expect(await slot('2026-01', 'food', 'foodIqd3')).toMatchObject({
      precision: 3,
      budgeted: -2000,
    });
    expect(figures()).toEqual(before);
  });

  it('PR2 C6 deletion into an existing coarser lane', async () => {
    await standing('IQD', '1300', '2025-12-01');
    await income('iqd3', '2026-01-05', 1000, 13000000);
    await income('iqd0', '2026-01-05', 1000, 13000);
    await lane('travelIqd3', 'travel', 'IQD.3');
    await lane('foodIqd0', 'food', 'IQD.0');
    await assign('travelIqd3', '2026-01', 6500000, 500, '2026-01-31', 'IQD.3');
    await assign('foodIqd0', '2026-01', 6500, 500, '2026-01-31', 'IQD.0');
    await refresh();
    expect(currency('2026-01', 'IQD')).toMatchObject({ pocketTotal: 1000 });
    expect(toBudget('2026-01')).toBe(1000);
    const before = figures();

    await handlers['budget/pocket-delete']({
      id: 'travelIqd3',
      transferId: 'food',
    });
    await refresh();

    expect(lanesOf('food', 'foreign').map(l => l.id)).toEqual(['foodIqd0']);
    expect(retirement('travelIqd3')?.owner).toBe('foodIqd0');
    expect(await slot('2026-01', 'food', 'foodIqd0')).toMatchObject({
      precision: 3,
      budgeted: 13000000,
      budgetedBase: 1000,
      balance: 13000000,
      balanceBase: 1000,
    });
    expect(figures()).toEqual(before);
    // A finer row is not admitted by Food's IQD.0 lane: Food's base slot.
    const later = await row('iqd3', '2026-02-10', -1000, -13000000, 'food');
    expect(laneOf(later)).toBe('food');
  });
});

describe('base child deletion (B1 to B4, B6)', () => {
  async function b1() {
    await standing('JPY', '100', '2025-12-01');
    await lane('travelKwd', 'travel', 'KWD.3');
    await income('usd', '2026-01-05', 50000, null);
    const spent = await row('jpy', '2026-01-12', -3000, -3000, 'travel');
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 10000,
    });
    await refresh();
    expect(toBudget('2026-01')).toBe(40000);
    expect(toBudget('2026-02')).toBe(40000);
    return spent;
  }

  it('B1 base child with foreign fallback', async () => {
    const spent = await b1();
    expect(laneOf(spent)).toBe('travel');
    const before = figures();

    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: 'food',
    });
    await refresh();

    expect(retirement('travel')).toEqual({ owner: 'food', tombstone: 0 });
    const [next] = lanesOf('travel', 'base');
    expect(next).toMatchObject({ encoding: '', generation: 1 });
    expect(slotFor('travel', '')).toBe(next.id);
    expect(lanesOf('travel', 'foreign').map(l => l.id)).toEqual(['travelKwd']);
    expect(retirement('travelKwd')).toBeNull();
    expect(laneOf(spent)).toBe('travel');
    expect(await shownCategory(spent)).toBe('food');
    expect(base('2026-01', 'food')).toEqual({
      budgeted: 10000,
      spent: -3000,
      balance: 7000,
    });
    expect(base('2026-02', 'food').balance).toBe(7000);
    for (const month of MONTHS) {
      expect(base(month, 'travel')).toEqual({
        budgeted: 0,
        spent: 0,
        balance: 0,
      });
    }
    expect(figures()).toEqual(before);

    // Undo tombstones the retirement and the new generation.
    await undo();
    await refresh();
    expect(retirement('travel')?.tombstone).toBe(1);
    expect(lanesOf('travel', 'base')).toEqual([]);
    expect(slotFor('travel', '')).toBe('travel');
    expect(base('2026-01', 'travel')).toEqual({
      budgeted: 10000,
      spent: -3000,
      balance: 7000,
    });
    expect(base('2026-01', 'food').budgeted).toBe(0);
    expect(figures()).toEqual(before);
  });

  it('B2 late absolute write to the retired history', async () => {
    await b1();
    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: 'food',
    });
    await refresh();
    await applyMessages([
      remote('zero_budgets', '202601-travel', 'amount', 12000),
    ]);
    await refresh();
    expect(zeroBudget('travel', '2026-01')?.amount).toBe(12000);
    expect(base('2026-01', 'food')).toEqual({
      budgeted: 12000,
      spent: -3000,
      balance: 9000,
    });
    expect(base('2026-01', 'travel').budgeted).toBe(0);
    expect(toBudget('2026-01')).toBe(38000);
  });

  it('B3 concurrent deletions', async () => {
    await b1();
    const before = figures();
    // Device A deletes into Food; device B, offline, into Shop, later.
    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: 'food',
    });
    await applyMessages([
      remote('category_pockets', 'travelBaseB', 'category', 'travel'),
      remote('category_pockets', 'travelBaseB', 'kind', 'base'),
      remote('category_pockets', 'travelBaseB', 'encoding', ''),
      remote('category_pockets', 'travelBaseB', 'generation', 1),
      remote('category_pockets', 'travelBaseB', 'tombstone', 0),
      remote('slot_retirements', 'travel', 'owner', 'shop'),
      remote('slot_retirements', 'travel', 'tombstone', 0),
    ]);
    await refresh();

    expect(count('slot_retirements')).toBe(1);
    expect(retirement('travel')?.owner).toBe('shop');
    const lanes = lanesOf('travel', 'base');
    expect(lanes).toHaveLength(2);
    const [current, other] = lanes.map(l => l.id).sort();
    expect(slotFor('travel', '')).toBe(current);
    expect(resolution(other)).toMatchObject({
      status: 'duplicate',
      effective_owner: current,
    });
    expect(base('2026-01', 'shop')).toEqual({
      budgeted: 10000,
      spent: -3000,
      balance: 7000,
    });
    expect(base('2026-01', 'food').budgeted).toBe(0);
    expect(figures()).toEqual(before);
  });

  it('B4 late carry edit and late row', async () => {
    await b1();
    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: 'food',
    });
    const [next] = lanesOf('travel', 'base');
    // An older client sets carryover on Travel and categorizes a row there.
    await applyMessages([
      remote('zero_budgets', '202601-travel', 'carryover', 1),
    ]);
    await remoteRow('late', {
      acct: 'usd',
      date: 20260115,
      amount: -20000,
      category: 'travel',
      isParent: 0,
      isChild: 0,
      tombstone: 0,
    });
    await refresh();
    expect(laneOf('late')).toBe('travel');
    expect(base('2026-01', 'food')).toEqual({
      budgeted: 10000,
      spent: -23000,
      balance: -13000,
    });
    // The retired lane rolls its overspending over.
    expect(base('2026-02', 'food').balance).toBe(-13000);
    expect(value('2026-02', 'last-month-overspent')).toBe(0);

    expect(
      await handlers['budget/route-to-pockets']({
        ids: ['late'],
        category: 'travel',
      }),
    ).toEqual({ routed: ['late'] });
    await refresh();
    expect(laneOf('late')).toBe(next.id);
    expect(base('2026-01', 'travel')).toEqual({
      budgeted: 0,
      spent: -20000,
      balance: -20000,
    });
    expect(base('2026-01', 'food').spent).toBe(-3000);

    await undo();
    await refresh();
    expect(laneOf('late')).toBe('travel');
  });

  it('B6 generations', async () => {
    await b1();
    const before = figures();
    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: 'food',
    });
    const [first] = lanesOf('travel', 'base');
    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: 'food',
    });
    const second = lanesOf('travel', 'base').find(l => l.id !== first.id)!;
    expect(second.generation).toBe(2);
    expect(retirement(first.id)?.owner).toBe('food');
    await refresh();
    expect(figures()).toEqual(before);

    // Device B cut over from generation 0 to its own generation 1 offline.
    await lane('travelBaseB', 'travel', '', 'base', 1);
    await applyMessages([
      remote('slot_retirements', 'travel', 'owner', 'food'),
    ]);
    await refresh();
    expect(slotFor('travel', '')).toBe(second.id);
    expect(resolution('travel')?.status).toBe('retired');
    expect(resolution(first.id)?.status).toBe('retired');
    expect(resolution('travelBaseB')).toMatchObject({
      status: 'duplicate',
      effective_owner: second.id,
    });
    expect(figures()).toEqual(before);

    await handlers['budget/pocket-merge']({ laneId: 'travelBaseB' });
    await refresh();
    expect(retirement('travelBaseB')?.owner).toBe(second.id);
    expect(resolution('travelBaseB')?.status).toBe('retired');
    expect(figures()).toEqual(before);
  });

  it('hides an empty base slot without a destination', async () => {
    await lane('travelJpy', 'travel', 'JPY.0');
    await income('usd', '2026-01-05', 50000, null);
    await refresh();
    await handlers['budget/base-child-delete']({ category: 'travel' });
    expect(count('slot_retirements')).toBe(0);
    expect(
      db.firstSync<{ hidden: number }>(
        'SELECT hidden FROM category_slot_meta WHERE id = ?',
        ['travel'],
      )?.hidden,
    ).toBe(1);
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 100,
    });
    await expect(
      handlers['budget/base-child-delete']({ category: 'travel' }),
    ).rejects.toThrow('transfer-required');
  });

  it('forwards api/base-child-delete and api/route-to-pockets', async () => {
    const spent = await b1();
    await api['api/base-child-delete']({
      categoryId: 'travel',
      transferCategoryId: 'food',
    });
    expect(retirement('travel')?.owner).toBe('food');
    const [next] = lanesOf('travel', 'base');
    expect(
      await api['api/route-to-pockets']({
        transactionIds: [spent],
        categoryId: 'travel',
      }),
    ).toEqual({ routed: [spent] });
    expect(laneOf(spent)).toBe(next.id);
  });
});

describe('whole parent and group deletion (W1, W2)', () => {
  async function w1() {
    await standing('JPY', '100', '2025-12-01');
    await income('usd', '2026-01-05', 50000, null);
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 5000, 5000, '2026-01-31', 'JPY.0');
    const spent = await row('usd', '2026-01-12', -3000, null, 'travel');
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 10000,
    });
    await refresh();
    expect(toBudget('2026-01')).toBe(45000);
    expect(toBudget('2026-02')).toBe(42000);
    return spent;
  }

  it('W1 whole parent', async () => {
    const spent = await w1();
    expect(await handlers['must-category-transfer']({ id: 'travel' })).toBe(
      true,
    );
    const before = figures();

    await handlers['category-delete']({ id: 'travel', transferId: 'food' });
    await refresh();

    expect(retirement('travel')?.owner).toBe('food');
    const [foodJpy] = lanesOf('food', 'foreign');
    expect(foodJpy).toMatchObject({ encoding: 'JPY.0' });
    expect(retirement('travelJpy')?.owner).toBe(foodJpy.id);
    // No doTransfer: Food's own assignment is unchanged.
    expect(zeroBudget('food', '2026-01')?.amount).toBe(10000);
    expect(base('2026-01', 'food')).toEqual({
      budgeted: 10000,
      spent: -3000,
      balance: 7000,
    });
    // Travel's lane resets its -30.00; Food's 100.00 carries.
    expect(base('2026-02', 'food').balance).toBe(10000);
    expect(value('2026-02', 'last-month-overspent')).toBe(-3000);
    expect(await slot('2026-01', 'food', foodJpy.id)).toMatchObject({
      budgeted: 5000,
      budgetedBase: 5000,
    });
    expect(await shownCategory(spent)).toBe('food');
    expect(figures()).toEqual(before);

    await undo();
    await refresh();
    expect(retirement('travel')?.tombstone).toBe(1);
    expect(retirement('travelJpy')?.tombstone).toBe(1);
    expect(lanesOf('food', 'foreign')).toEqual([]);
    expect(await shownCategory(spent)).toBe('travel');
    expect(figures()).toEqual(before);
  });

  it('W1 never transfers an affected category budget', async () => {
    await w1();
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 2000,
    });
    await refresh();
    const before = figures();
    await handlers['category-delete']({ id: 'travel', transferId: 'food' });
    await refresh();
    expect(zeroBudget('food', '2026-01')?.amount).toBe(10000);
    expect(zeroBudget('travel', '2026-01')?.amount).toBe(2000);
    expect(base('2026-01', 'food').budgeted).toBe(12000);
    expect(figures()).toEqual(before);
  });

  async function l1ThenFood() {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 20000, 20000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await lane('foodJpy', 'food', 'JPY.0');
    await assign('travelJpy', '2026-01', 5000, 5000, '2026-01-31', 'JPY.0');
    await assign('foodJpy', '2026-01', 10000, 10000, '2026-01-31', 'JPY.0');
    await row('jpy', '2026-01-12', -8000, -8000, 'travel');
    await refresh();
    await handlers['budget/pocket-delete']({
      id: 'travelJpy',
      transferId: 'food',
    });
    await refresh();
  }

  it('W2 inherited destination', async () => {
    await l1ThenFood();
    const before = figures();
    await handlers['category-delete']({ id: 'food', transferId: 'shop' });
    await refresh();
    const [shopJpy] = lanesOf('shop', 'foreign');
    expect(retirement('foodJpy')?.owner).toBe(shopJpy.id);
    expect(resolution('travelJpy')).toMatchObject({
      effective_category: 'shop',
      effective_owner: shopJpy.id,
    });
    expect(retirement('food')?.owner).toBe('shop');
    expect(figures()).toEqual(before);
    expect(await slot('2026-01', 'shop', shopJpy.id)).toMatchObject({
      balance: 7000,
    });
  });

  it('W2 group deletion of the inherited destination', async () => {
    await l1ThenFood();
    const before = figures();
    await handlers['category-group-delete']({
      id: 'group2',
      transferId: 'shop',
    });
    await refresh();
    const [shopJpy] = lanesOf('shop', 'foreign');
    expect(resolution('travelJpy')?.effective_owner).toBe(shopJpy.id);
    expect(retirement('food')?.owner).toBe('shop');
    expect(figures()).toEqual(before);

    await undo();
    await refresh();
    expect(resolution('foodJpy')?.status).toBe('live');
    expect(resolution('travelJpy')?.effective_owner).toBe('foodJpy');
    expect(figures()).toEqual(before);
  });

  it('TR1 tracking switch after a deletion', async () => {
    const spent = await w1();
    await handlers['category-delete']({ id: 'travel', transferId: 'food' });
    await refresh();
    const before = figures();
    await setType('tracking');
    await sheet.waitOnSpreadsheet();
    // Tracking: category wide by effective category, every lane, at base.
    expect(value('2026-01', 'sum-amount-food')).toBe(-3000);
    expect(await shownCategory(spent)).toBe('food');
    await setType('envelope');
    await refresh();
    expect(figures()).toEqual(before);
    expect(retirement('travel')?.owner).toBe('food');
  });

  it('DL9 rollback leaves no message', async () => {
    await w1();
    const messages = count('messages_crdt');
    const lanes = count('category_pockets');
    db.execQuery(`CREATE TRIGGER dl9 BEFORE UPDATE OF tombstone ON categories
      BEGIN SELECT RAISE(ABORT, 'dl9'); END`);
    await expect(
      handlers['category-delete']({ id: 'travel', transferId: 'food' }),
    ).rejects.toThrow();
    db.execQuery('DROP TRIGGER dl9');
    expect(count('messages_crdt')).toBe(messages);
    expect(count('slot_retirements')).toBe(0);
    expect(count('category_pockets')).toBe(lanes);
  });
});

describe('empty deletion and late messages (W3, W4)', () => {
  async function deletedShopLane() {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    const { id } = await handlers['budget/pocket-create']({
      category: 'shop',
      currency: 'JPY',
    });
    await refresh();
    await handlers['budget/pocket-delete']({ id });
    expect(retirement(id)).toBeNull();
    expect(resolution(id)).toMatchObject({ status: 'unresolved', active: 0 });
    return id;
  }

  const expected = {
    status: 'unresolved',
    effective_category: 'shop',
    effective_owner: null,
    active: 1,
  };

  it.each(['budget', 'row'] as const)(
    'W3/W4 a late %s message is counted, unresolved, and repaired',
    async kind => {
      const deleted = await deletedShopLane();
      if (kind === 'budget') {
        await remoteCell(deleted, '2026-03', '1000:~JPY.0@2026-03-31');
      } else {
        await remoteRow('late', {
          acct: 'jpy',
          date: 20260312,
          amount: -1000,
          transaction_amount: -1000,
          amount_pair: amountPair(-1000, -1000, 'jpy', 'JPY.0'),
          category: 'shop',
          pocket: deleted,
          isParent: 0,
          isChild: 0,
          tombstone: 0,
        });
      }
      // The same apply's rebuild shows the repair state.
      expect(resolution(deleted)).toEqual(expected);
      await refresh();
      const reserved = kind === 'budget' ? 1000 : -1000;
      expect(currency('2026-03', 'JPY').reserved).toBe(reserved);
      await reload();
      expect(resolution(deleted)).toEqual(expected);
      expect(currency('2026-03', 'JPY').reserved).toBe(reserved);

      await handlers['budget/pocket-choose-owner']({
        laneId: deleted,
        categoryId: 'food',
      });
      await refresh();
      const [foodJpy] = lanesOf('food', 'foreign');
      expect(retirement(deleted)?.owner).toBe(foodJpy.id);
      expect(resolution(deleted)).toMatchObject({
        status: 'retired',
        effective_category: 'food',
      });
      expect(currency('2026-03', 'JPY').reserved).toBe(reserved);

      await replayLog('forward');
      await refresh();
      expect(resolution(deleted)).toMatchObject({
        status: 'retired',
        effective_category: 'food',
      });
    },
  );
});

describe('repairs', () => {
  it('merges an orphan of an older-client deletion', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 4000, 4000, '2026-01-31', 'JPY.0');
    await refresh();
    const before = figures();
    // An older client deletes Travel upstream-style, mapping it to Food.
    await applyMessages([
      remote('category_mapping', 'travel', 'transferId', 'food'),
      remote('categories', 'travel', 'tombstone', 1),
    ]);
    await refresh();
    expect(resolution('travelJpy')).toMatchObject({
      status: 'orphan',
      effective_category: 'food',
      effective_owner: null,
    });
    await handlers['budget/pocket-merge']({ laneId: 'travelJpy' });
    await refresh();
    const [foodJpy] = lanesOf('food', 'foreign');
    expect(retirement('travelJpy')?.owner).toBe(foodJpy.id);
    expect(resolution('travelJpy')?.status).toBe('retired');
    expect(figures().map(f => f.currencies)).toEqual(
      before.map(f => f.currencies),
    );
    await expect(
      handlers['budget/pocket-merge']({ laneId: foodJpy.id }),
    ).rejects.toThrow('merge-not-applicable');
  });

  it('chooses an owner for a cycle', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('a', 'travel', 'JPY.0');
    await lane('b', 'shop', 'JPY.0');
    await assign('a', '2026-01', 1000, 1000, '2026-01-31', 'JPY.0');
    await applyMessages([
      remote('slot_retirements', 'a', 'owner', 'b'),
      remote('slot_retirements', 'a', 'tombstone', 0),
      remote('slot_retirements', 'b', 'owner', 'a'),
      remote('slot_retirements', 'b', 'tombstone', 0),
    ]);
    await refresh();
    expect(resolution('a')?.status).toBe('unresolved');
    await handlers['budget/pocket-choose-owner']({
      laneId: 'a',
      categoryId: 'food',
    });
    await refresh();
    const [foodJpy] = lanesOf('food', 'foreign');
    expect(retirement('a')?.owner).toBe(foodJpy.id);
    expect(resolution('a')).toMatchObject({
      status: 'retired',
      effective_category: 'food',
    });
    // b's chain now ends at Food's lane through a.
    expect(resolution('b')?.effective_category).toBe('food');
    expect(currency('2026-01', 'JPY').reserved).toBe(1000);
  });

  it('re-enters a mismatched cell on an inherited lane (MM1)', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await lane('foodJpy', 'food', 'JPY.0');
    await assign('travelJpy', '2026-01', 4000, 4000, '2026-01-31', 'JPY.0');
    await handlers['budget/pocket-delete']({
      id: 'travelJpy',
      transferId: 'food',
    });
    await remoteCell('travelJpy', '2026-02', '1000:1000~KWD.3@2026-02-28');
    await refresh();
    expect(currency('2026-02', 'JPY').valuation).toBe('unknown-native');
    expect(toBudget('2026-02')).toBe(6000);
    expect(
      await handlers['budget/pocket-reenter']({
        month: '2026-02',
        laneId: 'travelJpy',
        amount: 1000,
        encoding: 'JPY.0',
      }),
    ).toEqual({ status: 'ok' });
    await refresh();
    expect(cell('travelJpy', '2026-02')?.budget_pair).toBe(
      '1000:1000~JPY.0@2026-02-28',
    );
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: 5000,
      pocketTotal: 5000,
      writtenChange: 1000,
    });
    expect(toBudget('2026-02')).toBe(5000);
    // A well-stamped cell is not a re-entry.
    expect(
      await handlers['budget/pocket-reenter']({
        month: '2026-01',
        laneId: 'travelJpy',
        amount: 1,
        encoding: 'JPY.0',
      }),
    ).toEqual({ status: 'not-mismatched' });
  });

  it('moves an inherited base balance into the own lane', async () => {
    await income('usd', '2026-01-05', 50000, null);
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 10000,
    });
    await refresh();
    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: 'food',
    });
    await refresh();
    const before = figures();
    expect(
      await handlers['budget/pocket-move-inherited']({
        month: '2026-01',
        slotId: 'food',
        laneId: 'travel',
        amount: 2000,
      }),
    ).toEqual({ status: 'ok' });
    await refresh();
    expect(zeroBudget('travel', '2026-01')?.amount).toBe(8000);
    expect(zeroBudget('food', '2026-01')?.amount).toBe(2000);
    expect(base('2026-01', 'food').budgeted).toBe(10000);
    expect(figures()).toEqual(before);
    // Only an inherited lane of the named slot can be moved.
    await expect(
      handlers['budget/pocket-move-inherited']({
        month: '2026-01',
        slotId: 'shop',
        laneId: 'travel',
        amount: 1,
      }),
    ).rejects.toThrow('lane-not-inherited');
  });
});

describe('writable precision through the deletion handler (WP1, WP4)', () => {
  async function wpSetup() {
    await standing('IQD', '1', '2025-12-01');
    await income('iqd3', '2026-01-05', 100000, 1000000);
    await lane('travelIqd', 'travel', 'IQD.3');
    await lane('foodIqd', 'food', 'IQD.0');
    await assign('travelIqd', '2026-01', 500, 50, '2026-01-31', 'IQD.3');
    await refresh();
    await handlers['budget/pocket-delete']({
      id: 'travelIqd',
      transferId: 'food',
    });
    await refresh();
  }

  it('WP1 coarse destination set zero and Move inherited balance', async () => {
    await wpSetup();
    expect(retirement('travelIqd')?.owner).toBe('foodIqd');
    expect(lanesOf('food', 'foreign').map(l => l.encoding)).toEqual(['IQD.0']);
    expect(await slot('2026-01', 'food', 'foodIqd')).toMatchObject({
      precision: 3,
      budgeted: 500,
    });
    expect(currency('2026-01', 'IQD')).toMatchObject({
      pocketTotal: 50,
      writtenChange: 50,
    });
    expect(toBudget('2026-01')).toBe(99950);

    await handlers['budget/set-zero']({ month: '2026-01' });
    await refresh();
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
      '-500:-50~IQD.3@2026-01-31',
    );
    expect(cell('travelIqd', '2026-01')?.budget_pair).toBe(
      '500:50~IQD.3@2026-01-31',
    );
    expect(toBudget('2026-01')).toBe(100000);
    expect(currency('2026-02', 'IQD')).toMatchObject({
      reserved: 500,
      pocketTotal: 50,
      writtenChange: 50,
    });
    expect(toBudget('2026-02')).toBe(99950);

    const lanes = count('category_pockets');
    expect(
      await handlers['budget/pocket-move-inherited']({
        month: '2026-01',
        slotId: 'foodIqd',
        laneId: 'travelIqd',
        amount: { amount: 500, encoding: 'IQD.3' },
      }),
    ).toEqual({ status: 'ok' });
    await refresh();
    expect(cell('travelIqd', '2026-01')?.budget_pair).toBe(
      '0:0~IQD.3@2026-01-31',
    );
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
      '0:0~IQD.0@2026-01-31',
    );
    expect(count('category_pockets')).toBe(lanes);
    for (const month of MONTHS) {
      expect(currency(month, 'IQD').reserved).toBe(0);
    }
    expect(toBudget('2026-02')).toBe(100000);

    // A request in another currency writes nothing.
    expect(
      await handlers['budget/pocket-move-inherited']({
        month: '2026-01',
        slotId: 'foodIqd',
        laneId: 'travelIqd',
        amount: { amount: 1, encoding: 'JPY.0' },
      }),
    ).toEqual({ status: 'encoding-mismatch' });
  });

  it('WP4 sync, stale writers, undo and replay', async () => {
    await wpSetup();
    const pairB = '500:50~IQD.3@2026-01-31';
    const pairA = '-500:-50~IQD.3@2026-01-31';
    await handlers['budget/pocket-budget-set']({
      month: '2026-01',
      pocketId: 'foodIqd',
      amount: 1000,
      encoding: 'IQD.3',
    });
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(pairB);
    await handlers['budget/set-zero']({ month: '2026-01' });
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(pairA);
    await refresh();
    expect((await slot('2026-01', 'food', 'foodIqd')).budgeted).toBe(0);

    await remoteCell('foodIqd', '2026-01', pairB);
    await refresh();
    expect((await slot('2026-01', 'food', 'foodIqd')).budgeted).toBe(1000);

    await remoteCell('foodIqd', '2026-01', '2:200~IQD.0@2026-01-31');
    await refresh();
    expect((await slot('2026-01', 'food', 'foodIqd')).budgeted).toBe(2500);
    const lanes = count('category_pockets');
    const retirements = count('slot_retirements');
    await handlers['budget/set-zero']({ month: '2026-01' });
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(pairA);
    await undo();
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
      '2:200~IQD.0@2026-01-31',
    );
    expect(count('category_pockets')).toBe(lanes);
    expect(count('slot_retirements')).toBe(retirements);
    const final = cell('foodIqd', '2026-01');

    await replayLog('forward');
    expect(cell('foodIqd', '2026-01')).toEqual(final);
    expect(retirement('travelIqd')?.owner).toBe('foodIqd');
    await replayLog('reverse');
    expect(cell('foodIqd', '2026-01')).toEqual(final);
    expect(retirement('travelIqd')?.owner).toBe('foodIqd');
  });
});

describe('export (EX1)', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'actual-ex1-'));
    fs._setDocumentDir(directory);
    vi.stubEnv('ACTUAL_DATA_DIR', directory);
    // Archive entries need a real modification time.
    vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 5, 15));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    rmSync(directory, { recursive: true, force: true });
  });

  const TABLES = [
    'category_pockets',
    'pocket_budgets',
    'slot_retirements',
    'category_slot_meta',
    'zero_budgets',
    'category_mapping',
  ];
  const snapshot = (run: (sql: string) => unknown[]) => ({
    ...Object.fromEntries(
      TABLES.map(table => [table, run(`SELECT * FROM ${table} ORDER BY id`)]),
    ),
    transactions: run(
      `SELECT id, category, pocket, amount_pair, pair_encoding
         FROM transactions ORDER BY id`,
    ),
  });

  it('EX1 ZIP round trip preserves every authority', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('usd', '2026-01-05', 50000, null);
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 5000, 5000, '2026-01-31', 'JPY.0');
    await assign('travelJpy', '2026-02', 1000, null, '2026-02-10', 'JPY.0');
    await row('usd', '2026-01-12', -3000, null, 'travel');
    await refresh();
    await handlers['category-delete']({ id: 'travel', transferId: 'food' });
    await handlers['budget/slot-meta-set']({ id: 'food', shown: true });
    await refresh();
    const before = figures();
    const local = snapshot(sql => db.runQuery(sql, [], true));

    const dir = fs.getBudgetDir('ex1');
    await fs.mkdir(dir);
    await fs.writeFile(
      join(dir, 'db.sqlite'),
      Buffer.from(await sqlite.exportDatabase(db.getDatabase()!)),
    );
    await fs.writeFile(
      join(dir, 'metadata.json'),
      JSON.stringify({ id: 'ex1', budgetName: 'EX1' }),
    );
    await prefs.loadPrefs('ex1');
    const exported = await exportBuffer({ alreadyMutating: true });
    const { id } = await importBuffer(
      { fileId: null, groupId: null },
      exported!.data,
    );
    const imported = await sqlite.openDatabase(
      readFileSync(join(fs.getBudgetDir(id), 'db.sqlite')),
    );
    expect(snapshot(sql => sqlite.runQuery(imported, sql, [], true))).toEqual(
      local,
    );

    // The imported file computes the same budget.
    db.setDatabase(imported);
    await prefs.savePrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: 'USD',
        precision: 2,
      }),
    });
    await reload();
    expect(figures()).toEqual(before);
  });
});

describe('fix round 1: ordinary sources into divergent destinations (F1)', () => {
  async function cutTravelInto(destination: string) {
    await income('usd', '2026-01-05', 50000, null);
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 5000,
    });
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 10000,
    });
    await refresh();
    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: destination,
    });
    await refresh();
  }

  it('adds an ordinary category to an inherited destination', async () => {
    await cutTravelInto('food');
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 2000,
    });
    await refresh();
    expect(base('2026-01', 'food').budgeted).toBe(15000);
    expect(toBudget('2026-01')).toBe(33000);
    const before = figures();

    await handlers['category-delete']({ id: 'shop', transferId: 'food' });
    await refresh();

    expect(base('2026-01', 'food').budgeted).toBe(17000);
    // The own lane takes Shop's amount; the inherited history is unchanged.
    expect(zeroBudget('food', '2026-01')?.amount).toBe(12000);
    expect(zeroBudget('travel', '2026-01')?.amount).toBe(5000);
    expect(toBudget('2026-01')).toBe(33000);
    expect(figures().map(f => f.toBudget)).toEqual(before.map(f => f.toBudget));

    await undo();
    await refresh();
    expect(zeroBudget('food', '2026-01')?.amount).toBe(10000);
    expect(base('2026-01', 'food').budgeted).toBe(15000);
    expect(toBudget('2026-01')).toBe(33000);
  });

  it('adds an ordinary category to a later base generation', async () => {
    await cutTravelInto('food');
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 2000,
    });
    await refresh();
    const [next] = lanesOf('travel', 'base');
    await handlers['category-delete']({ id: 'shop', transferId: 'travel' });
    await refresh();
    expect(cell(next.id, '2026-01')?.budget_pair).toBe('2000:2000~@2026-01-31');
    expect(base('2026-01', 'travel').budgeted).toBe(2000);
    // Travel's retired history stays under Food.
    expect(base('2026-01', 'food').budgeted).toBe(15000);
    expect(toBudget('2026-01')).toBe(33000);
  });

  it('transfers the ordinary members of a mixed group', async () => {
    await db.insertCategory({ id: 'misc', name: 'misc', cat_group: 'group2' });
    await cutTravelInto('shop');
    await lane('foodJpy', 'food', 'JPY.0');
    await actions.setBudget({
      category: 'misc',
      month: '2026-01',
      amount: 3000,
    });
    await refresh();
    expect(base('2026-01', 'shop').budgeted).toBe(5000);
    expect(toBudget('2026-01')).toBe(32000);

    await handlers['category-group-delete']({
      id: 'group2',
      transferId: 'shop',
    });
    await refresh();

    // Food's lane is retired into Shop; Misc's 30.00 is added to Shop's own.
    expect(retirement('food')?.owner).toBe('shop');
    expect(zeroBudget('food', '2026-01')?.amount).toBe(10000);
    expect(zeroBudget('shop', '2026-01')?.amount).toBe(3000);
    expect(base('2026-01', 'shop').budgeted).toBe(18000);
    expect(toBudget('2026-01')).toBe(32000);
  });

  it('writes no transfer for an all-affected group', async () => {
    await cutTravelInto('food');
    await lane('foodJpy', 'food', 'JPY.0');
    await refresh();
    expect(base('2026-01', 'food').budgeted).toBe(15000);
    expect(toBudget('2026-01')).toBe(35000);
    const [next] = lanesOf('travel', 'base');

    await handlers['category-group-delete']({
      id: 'group2',
      transferId: 'travel',
    });
    await refresh();

    // Food's lanes resolve into Travel's current generation, untouched.
    expect(cell(next.id, '2026-01')).toBeNull();
    expect(base('2026-01', 'travel').budgeted).toBe(15000);
    expect(toBudget('2026-01')).toBe(35000);

    await undo();
    await refresh();
    expect(base('2026-01', 'food').budgeted).toBe(15000);
    expect(toBudget('2026-01')).toBe(35000);
  });
});

describe('fix round 1: deletion in tracking budgets (F2)', () => {
  async function tracking() {
    await lane('travelJpy', 'travel', 'JPY.0');
    await income('usd', '2026-01-05', 50000, null);
    await refresh();
    await db.update('preferences', { id: 'budgetType', value: 'tracking' });
    await setType('tracking');
    await sheet.waitOnSpreadsheet();
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 3000,
    });
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 2000,
    });
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 1000,
    });
    await sheet.waitOnSpreadsheet();
  }
  const reflect = (category: string) =>
    db.firstSync<{ amount: number }>(
      'SELECT amount FROM reflect_budgets WHERE month = ? AND category = ?',
      [202601, category],
    )?.amount ?? 0;

  it('transfers a tracking budget of an affected category', async () => {
    await tracking();
    await handlers['category-delete']({ id: 'travel', transferId: 'food' });
    await sheet.waitOnSpreadsheet();
    expect(reflect('food')).toBe(5000);
    expect(value('2026-01', 'budget-food')).toBe(5000);
    // The envelope lanes are still retired for a later switch back.
    expect(retirement('travelJpy')?.owner).toBe(
      lanesOf('food', 'foreign')[0].id,
    );
    expect(retirement('travel')?.owner).toBe('food');

    await undo();
    await sheet.waitOnSpreadsheet();
    expect(reflect('food')).toBe(2000);
    expect(reflect('travel')).toBe(3000);
    expect(retirement('travel')?.tombstone).toBe(1);
  });

  it('transfers the tracking budgets of an affected group', async () => {
    await tracking();
    await handlers['category-group-delete']({
      id: 'group',
      transferId: 'food',
    });
    await sheet.waitOnSpreadsheet();
    expect(reflect('food')).toBe(6000);
    expect(retirement('travel')?.owner).toBe('food');

    await undo();
    await sheet.waitOnSpreadsheet();
    expect(reflect('food')).toBe(2000);
    expect(reflect('travel')).toBe(3000);
    expect(reflect('shop')).toBe(1000);
  });
});

describe('fix round 1: reader shapes for repairs (F3, F4)', () => {
  it('reports an unresolved null-owner lane as its own slot lane (W3)', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    const { id } = await handlers['budget/pocket-create']({
      category: 'shop',
      currency: 'JPY',
    });
    await refresh();
    await handlers['budget/pocket-delete']({ id });
    await remoteCell(id, '2026-03', '1000:~JPY.0@2026-03-31');
    await refresh();
    const pocket = await slot('2026-03', 'shop', id);
    expect(pocket.lanes).toEqual([
      expect.objectContaining({
        laneId: id,
        kind: 'own',
        status: 'unresolved',
      }),
    ]);
  });

  it('reports an orphan without a destination slot as its own slot lane', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 4000, 4000, '2026-01-31', 'JPY.0');
    await applyMessages([
      remote('category_mapping', 'travel', 'transferId', 'food'),
      remote('categories', 'travel', 'tombstone', 1),
    ]);
    await refresh();
    const pocket = await slot('2026-01', 'food', 'travelJpy');
    expect(pocket.lanes).toEqual([
      expect.objectContaining({
        laneId: 'travelJpy',
        kind: 'own',
        status: 'orphan',
      }),
    ]);
  });

  it('reads a base slot lanes for their details and repairs (F4)', async () => {
    await income('usd', '2026-01-05', 50000, null);
    await row('usd', '2026-01-12', -3000, null, 'travel');
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 1000,
    });
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: -1000,
    });
    await refresh();
    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: 'food',
    });
    await lane('foodBase2', 'food', '', 'base', 0);
    await refresh();
    expect(
      await handlers['budget/base-slot-lanes']({
        month: '2026-01',
        category: 'food',
      }),
    ).toEqual({
      slotId: 'food',
      lanes: [
        {
          laneId: 'food',
          kind: 'own',
          originCategoryId: 'food',
          status: 'live',
          budgeted: -1000,
          spent: 0,
          carryIn: 0,
          balance: -1000,
          carryover: false,
        },
        {
          laneId: 'foodBase2',
          kind: 'inherited',
          originCategoryId: 'food',
          status: 'duplicate',
          budgeted: 0,
          spent: 0,
          carryIn: 0,
          balance: 0,
          carryover: false,
        },
        {
          laneId: 'travel',
          kind: 'inherited',
          originCategoryId: 'travel',
          status: 'retired',
          budgeted: 1000,
          spent: -3000,
          carryIn: 0,
          balance: -2000,
          carryover: false,
        },
      ],
    });
  });
});

describe('fix round 2: base repair entry for base-only histories (F4)', () => {
  it('lists every category that displays repairable base history', async () => {
    await db.insertCategory({ id: 'misc', name: 'misc', cat_group: 'group2' });
    await db.insertCategory({ id: 'gone', name: 'gone', cat_group: 'group2' });
    await db.insertCategory({
      id: 'other',
      name: 'other',
      cat_group: 'group2',
    });
    await income('usd', '2026-01-05', 50000, null);
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 1000,
    });
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: -1000,
    });
    await actions.setBudget({
      category: 'other',
      month: '2026-01',
      amount: 500,
    });
    await refresh();
    // Base-only inheritance (Food) and a later generation (Travel).
    await handlers['budget/base-child-delete']({
      category: 'travel',
      transferId: 'food',
    });
    // A one-lane cycle: Shop's and Misc's own lanes name each other.
    await applyMessages([
      remote('slot_retirements', 'shop', 'owner', 'misc'),
      remote('slot_retirements', 'shop', 'tombstone', 0),
      remote('slot_retirements', 'misc', 'owner', 'shop'),
      remote('slot_retirements', 'misc', 'tombstone', 0),
    ]);
    // An orphan later-generation lane of an older-client deletion.
    await lane('goneBase', 'gone', '', 'base', 1);
    await applyMessages([
      remote('pocket_budgets', '202601-goneBase', 'month', 202601),
      remote('pocket_budgets', '202601-goneBase', 'lane', 'goneBase'),
      remote(
        'pocket_budgets',
        '202601-goneBase',
        'budget_pair',
        '700:700~@2026-01-31',
      ),
      remote('category_mapping', 'gone', 'transferId', 'other'),
      remote('categories', 'gone', 'tombstone', 1),
    ]);
    await refresh();

    // No foreign pockets anywhere: the pocket reader has none of them.
    expect([...(await readCategoryPockets('2026-01')).keys()]).toEqual([]);
    expect(resolution('shop')).toMatchObject({
      status: 'unresolved',
      effective_category: 'shop',
    });
    expect(resolution('goneBase')).toMatchObject({
      status: 'orphan',
      effective_category: 'other',
    });
    expect(await handlers['budget/base-slot-categories']()).toEqual([
      'food',
      'misc',
      'other',
      'shop',
      'travel',
    ]);
    // Each entry opens lanes it can repair.
    const travel = await handlers['budget/base-slot-lanes']({
      month: '2026-01',
      category: 'travel',
    });
    expect(travel.lanes).toEqual([
      expect.objectContaining({ kind: 'own', status: 'live', budgeted: 0 }),
    ]);
    expect(
      (
        await handlers['budget/base-slot-lanes']({
          month: '2026-01',
          category: 'shop',
        })
      ).lanes,
    ).toEqual([
      expect.objectContaining({ laneId: 'shop', status: 'unresolved' }),
    ]);
    expect(
      (
        await handlers['budget/base-slot-lanes']({
          month: '2026-01',
          category: 'other',
        })
      ).lanes.map(l => [l.laneId, l.status]),
    ).toEqual([
      ['other', 'live'],
      ['goneBase', 'orphan'],
    ]);
  });

  it('lists no category of an ordinary budget', async () => {
    await income('usd', '2026-01-05', 50000, null);
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 1000,
    });
    await lane('foodJpy', 'food', 'JPY.0');
    await refresh();
    expect(await handlers['budget/base-slot-categories']()).toEqual([]);
  });
});

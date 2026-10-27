import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as db from '#server/db';
// Registers the budget app's sync listener on the events `fullSync` emits
import '#server/main';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';
import { fullSync, setSyncingMode } from '#server/sync';
import * as mockSyncServer from '#server/tests/mockSyncServer';
import { undo, withUndo } from '#server/undo';
import * as monthUtils from '#shared/months';

import {
  getSheetValue,
  resetIncomeCarryover,
  setBudget,
  setCategoryCarryover,
} from './actions';
import { createAllBudgets } from './base';
import { seedCarryoverChain } from './carryover-seed';
import { cleanupTemplate } from './cleanup-template';

vi.mock('#server/post');

const MONTHS_2027 = [
  '2027-01',
  '2027-02',
  '2027-03',
  '2027-04',
  '2027-05',
  '2027-06',
];

function carryover(month: string, category: string) {
  return sheet.getCellValue(
    monthUtils.sheetForMonth(month),
    `carryover-${category}`,
  );
}

function budgetRow(table: string, month: string, category: string) {
  return db.firstSync<db.DbZeroBudget>(
    `SELECT * FROM ${table} WHERE month = ? AND category = ?`,
    [parseInt(month.replace('-', '')), category],
  );
}

// Rollover is turned on in Jan 2026 while the budget ends at Dec 2026, then
// the clock moves to Jun 2026 so Jan–Jun 2027 get created with no rows.
async function setup(
  budgetType: 'envelope' | 'tracking',
  categories = ['card'],
) {
  if (budgetType === 'tracking') {
    db.runQuery(
      "INSERT INTO preferences (id, value) VALUES ('budgetType', 'tracking')",
    );
  }

  await db.insertAccount({ id: 'account', name: 'Account' });
  await db.insertCategoryGroup({
    id: 'income-group',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategory({
    id: 'income',
    name: 'Income',
    cat_group: 'income-group',
    is_income: 1,
  });
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategory({
    id: 'card',
    name: 'Credit card',
    cat_group: 'group',
  });
  await db.insertTransaction({
    date: '2026-01-15',
    amount: -100000,
    account: 'account',
    category: 'card',
  });

  global.currentMonth = '2025-12';
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = budgetType;
  await createAllBudgets();

  for (const category of categories) {
    await setCategoryCarryover({ startMonth: '2026-01', category, flag: true });
  }

  global.currentMonth = '2026-06';
  await createAllBudgets();
  await sheet.waitOnSpreadsheet();
}

describe('carryover', () => {
  beforeEach(global.emptyDatabase());
  afterEach(() => {
    global.currentMonth = null;
    setSyncingMode('disabled');
    mockSyncServer.reset();
  });

  it.each(['envelope', 'tracking'] as const)(
    'keeps rolling over past the months that have rows (%s)',
    async budgetType => {
      await setup(budgetType);

      for (const month of MONTHS_2027) {
        expect(carryover(month, 'card')).toBe(true);
        expect(
          await getSheetValue(monthUtils.sheetForMonth(month), 'leftover-card'),
        ).toBe(-100000);
      }
    },
  );

  it('inherits the flag in a budgeted month, and undo restores the inherited flag', async () => {
    await setup('envelope');

    await setBudget({ category: 'card', month: '2027-03', amount: 5000 });
    await withUndo(() =>
      setBudget({ category: 'card', month: '2027-05', amount: 5000 }),
    );
    await sheet.waitOnSpreadsheet();

    expect(budgetRow('zero_budgets', '2027-03', 'card')?.carryover).toBeNull();
    expect(carryover('2027-03', 'card')).toBe(true);
    expect(carryover('2027-04', 'card')).toBe(true);

    await undo();
    await sheet.waitOnSpreadsheet();

    const undone = budgetRow('zero_budgets', '2027-05', 'card');
    expect(undone?.amount).toBe(0);
    expect(undone?.carryover).toBeNull();
    expect(carryover('2027-05', 'card')).toBe(true);
  });

  it('turns rollover off from the chosen month on', async () => {
    await setup('envelope');

    await setCategoryCarryover({
      startMonth: '2027-02',
      category: 'card',
      flag: false,
    });
    await sheet.waitOnSpreadsheet();

    expect(carryover('2027-01', 'card')).toBe(true);
    for (const month of MONTHS_2027.slice(1)) {
      expect(carryover(month, 'card')).toBe(false);
    }
  });

  it('resets income auto-hold for one month only', async () => {
    await setup('envelope', ['card', 'income']);
    await setBudget({ category: 'income', month: '2027-02', amount: 0 });
    await sheet.waitOnSpreadsheet();

    await resetIncomeCarryover({ month: '2027-02' });
    await sheet.waitOnSpreadsheet();

    expect(carryover('2027-02', 'income')).toBe(false);
    expect(budgetRow('zero_budgets', '2027-03', 'income')?.carryover).toBe(1);
    expect(carryover('2027-04', 'income')).toBe(true);
  });

  it('cleanup leaves an inherited rollover category overspent', async () => {
    await setup('envelope');
    await db.insertTransaction({
      date: '2027-03-01',
      amount: 500000,
      account: 'account',
      category: 'income',
    });
    await sheet.waitOnSpreadsheet();

    await cleanupTemplate({ month: '2027-03' });
    await sheet.waitOnSpreadsheet();

    expect(await getSheetValue('budget202703', 'budget-card')).toBe(0);
  });

  it('seeds an off flag after windows that ended before this month', async () => {
    await createSeedCategories();
    // A and C carry through Mar, B through Sep. C has an Apr row with 0.
    await insertCarryoverWindow('zero_budgets', 'a', '2026-03');
    await insertCarryoverWindow('zero_budgets', 'b', '2026-09');
    await insertCarryoverWindow('zero_budgets', 'c', '2026-03');
    await db.insert('zero_budgets', {
      id: '202604-c',
      month: 202604,
      category: 'c',
      amount: 5000,
      carryover: 0,
    });
    // Seeding the inactive table must not reach the envelope sheet
    await insertCarryoverWindow('reflect_budgets', 'c', '2026-03');
    await loadInOctober();

    await seedCarryoverChain();
    await sheet.waitOnSpreadsheet();

    expect(budgetRow('zero_budgets', '2026-04', 'a')?.carryover).toBe(0);
    for (const month of monthUtils.rangeInclusive('2026-04', '2026-10')) {
      expect(carryover(month, 'a')).toBe(false);
    }

    expect(budgetRow('zero_budgets', '2026-10', 'b')).toBeNull();
    expect(carryover('2026-10', 'b')).toBe(true);
    expect(carryover('2026-11', 'b')).toBe(true);

    const c = budgetRow('zero_budgets', '2026-04', 'c');
    expect(c?.amount).toBe(5000);
    expect(c?.carryover).toBe(0);
    expect(budgetRow('zero_budgets', '2026-05', 'c')).toBeNull();
    expect(budgetRow('reflect_budgets', '2026-04', 'c')?.carryover).toBe(0);
    expect(await getSheetValue('budget202604', 'budget-c')).toBe(5000);

    // The second run is a no-op, even if a window has lapsed since
    db.runQuery("DELETE FROM zero_budgets WHERE id = '202604-a'");
    await seedCarryoverChain();
    expect(budgetRow('zero_budgets', '2026-04', 'a')).toBeNull();
  });

  it('seeds after a full sync, but not one whose group changed mid-request', async () => {
    await createSeedCategories();
    await insertCarryoverWindow('zero_budgets', 'a', '2026-03');
    await loadInOctober();
    await prefs.loadPrefs();
    await prefs.savePrefs({ groupId: 'group' });
    setSyncingMode('enabled');

    // A sync reset swaps the group while the request is in flight, so the
    // response is discarded but the sync still reports success
    const handlers: Record<string, (data: Uint8Array) => Promise<Uint8Array>> =
      mockSyncServer.handlers;
    const handleSync = handlers['/sync/sync'];
    handlers['/sync/sync'] = async data => {
      await prefs.savePrefs({ groupId: 'other-group' });
      return handleSync(data);
    };
    try {
      expect(await fullSync()).toEqual({ messages: [] });
    } finally {
      handlers['/sync/sync'] = handleSync;
    }
    await waitForQueuedSeed();
    expect(budgetRow('zero_budgets', '2026-04', 'a')).toBeNull();

    await fullSync();
    await waitForQueuedSeed();
    expect(budgetRow('zero_budgets', '2026-04', 'a')?.carryover).toBe(0);
  });
});

async function createSeedCategories() {
  await db.insertAccount({ id: 'account', name: 'Account' });
  await db.insertCategoryGroup({
    id: 'income-group',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  for (const id of ['a', 'b', 'c']) {
    await db.insertCategory({ id, name: id, cat_group: 'group' });
  }
  await db.insertTransaction({
    date: '2026-01-15',
    amount: -100000,
    account: 'account',
    category: 'a',
  });
}

async function insertCarryoverWindow(
  table: 'zero_budgets' | 'reflect_budgets',
  category: string,
  end: string,
) {
  for (const month of monthUtils.rangeInclusive('2026-01', end)) {
    const dbMonth = parseInt(month.replace('-', ''));
    await db.insert(table, {
      id: `${dbMonth}-${category}`,
      month: dbMonth,
      category,
      carryover: 1,
    });
  }
}

// The sync listener queues the seed behind any running mutator
function waitForQueuedSeed() {
  return runMutator(() => Promise.resolve());
}

async function loadInOctober() {
  global.currentMonth = '2026-10';
  await sheet.loadSpreadsheet(db);
  await createAllBudgets();
}

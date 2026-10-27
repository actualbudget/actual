import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Timestamp } from '@actual-app/crdt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { applyMessages, setSyncingMode } from '#server/sync';
import * as monthUtils from '#shared/months';

import {
  copyUntilYearEnd,
  getSheetValue,
  set3MonthAvg,
  setBudget,
  setBuffer,
  setCategoryCarryover,
} from './actions';
import { createBudget, loadFutureBufferStart } from './base';

vi.mock('#server/post');

const WINDOW = ['2026-10', '2026-11', '2026-12'];

function buffer(month: string) {
  return getSheetValue(monthUtils.sheetForMonth(month), 'buffered-selected');
}

function toBudget(month: string) {
  return getSheetValue(monthUtils.sheetForMonth(month), 'to-budget');
}

function sendTimestamp(): Timestamp {
  const timestamp = Timestamp.send();
  if (timestamp == null) {
    throw new Error('Timestamp.send() returned null');
  }
  return timestamp;
}

async function setMode(value: string | null) {
  await db.update('preferences', { id: 'futureBufferMode', value });
  await sheet.waitOnSpreadsheet();
}

async function createCategories() {
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
  for (const id of ['bills', 'groceries', 'card']) {
    await db.insertCategory({ id, name: id, cat_group: 'group' });
  }
}

async function budgetBase() {
  await db.insertTransaction({
    date: '2026-10-01',
    amount: 520000,
    account: 'account',
    category: 'income',
  });
  await setBudget({ category: 'bills', month: '2026-10', amount: 260000 });
  await setBudget({ category: 'groceries', month: '2026-10', amount: 40000 });
  await setBudget({ category: 'bills', month: '2026-11', amount: 150000 });
  await setBudget({ category: 'bills', month: '2026-12', amount: 50000 });
}

// Current month Oct 2026 with Oct–Dec created. Oct income 5,200, budgeted
// 3,000 in Oct, 1,500 in Nov and 500 in Dec. Mode on from Oct.
async function setup() {
  global.currentMonth = '2026-10';
  await createCategories();
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = 'envelope';
  await createBudget(WINDOW);
  await budgetBase();
  await setMode('2026-10');
}

describe('future buffer', () => {
  beforeEach(global.emptyDatabase());
  afterEach(() => {
    global.currentMonth = null;
    setSyncingMode('disabled');
    vi.unstubAllEnvs();
  });

  it('holds what the future months need', async () => {
    await setup();

    expect(await buffer('2026-10')).toBe(200000);
    expect(await buffer('2026-11')).toBe(50000);
    // The last month in the window has nothing after it
    expect(await buffer('2026-12')).toBe(0);
    for (const month of WINDOW) {
      expect(await toBudget(month)).toBe(20000);
    }

    // Income in Nov counts, but Nov's surplus isn't lent back to Oct
    await db.insertTransaction({
      id: 'nov-income',
      date: '2026-11-10',
      amount: 100000,
      account: 'account',
      category: 'income',
    });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(100000);
    expect(await toBudget('2026-10')).toBe(120000);

    await db.updateTransaction({ id: 'nov-income', amount: 300000 });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(0);
    expect(await toBudget('2026-10')).toBe(220000);
    expect(await toBudget('2026-11')).toBe(320000);
  });

  it('has no cap', async () => {
    await setup();

    await setBudget({ category: 'bills', month: '2026-11', amount: 700000 });
    await sheet.waitOnSpreadsheet();

    expect(await buffer('2026-10')).toBe(750000);
    expect(await toBudget('2026-10')).toBe(-530000);
  });

  it('holds overspending that reaches next month, except in rollover categories', async () => {
    await setup();
    await setCategoryCarryover({
      startMonth: '2026-10',
      category: 'card',
      flag: true,
    });
    await db.insertTransaction({
      date: '2026-10-05',
      amount: -100000,
      account: 'account',
      category: 'card',
    });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(200000);

    await db.insertTransaction({
      date: '2026-10-05',
      amount: -70000,
      account: 'account',
      category: 'groceries',
    });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(230000);
    expect(await toBudget('2026-10')).toBe(-10000);
  });

  it('matches manual mode in the last month, and follows the preference from sync', async () => {
    await setup();

    await applyMessages([
      {
        dataset: 'preferences',
        row: 'futureBufferMode',
        column: 'value',
        value: null,
        timestamp: sendTimestamp(),
      },
    ]);
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(0);
    expect(await toBudget('2026-10')).toBe(220000);
    expect(await toBudget('2026-12')).toBe(20000);

    await applyMessages([
      {
        dataset: 'preferences',
        row: 'futureBufferMode',
        column: 'value',
        value: '2026-10',
        timestamp: sendTimestamp(),
      },
    ]);
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(200000);
    expect(await toBudget('2026-10')).toBe(20000);
  });

  it('reads the stored buffer in frozen months and months before the start', async () => {
    await setup();
    await setBudget({ category: 'income', month: '2026-10', amount: 0 });
    await setCategoryCarryover({
      startMonth: '2026-10',
      category: 'income',
      flag: true,
    });
    await setBuffer('2026-11', 30000, true);
    await sheet.waitOnSpreadsheet();

    // Frozen months ignore income auto-hold
    await setBuffer('2026-10', 0, true);
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(0);
    expect(await buffer('2026-11')).toBe(30000);

    await setMode('2026-12');
    await setBuffer('2026-12', 10000);
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-12')).toBe(0);

    // Without the mode, an unfrozen month uses today's rule
    await setMode(null);
    expect(await buffer('2026-12')).toBe(10000);
  });

  it('skips buffer writes that change nothing', async () => {
    await setup();
    // Messages are only recorded while syncing
    setSyncingMode('enabled');

    await setBuffer('2026-10', 0);
    expect(await db.all('SELECT * FROM messages_crdt')).toEqual([]);

    await setBuffer('2026-10', 5000, true);
    const messages = await db.all('SELECT * FROM messages_crdt');
    await setBuffer('2026-10', 5000, true);
    await setBuffer('2026-10', 5000);
    expect(await db.all('SELECT * FROM messages_crdt')).toEqual(messages);
    expect(
      await db.first('SELECT * FROM zero_budget_months WHERE id = ?', [
        '2026-10',
      ]),
    ).toEqual({ id: '2026-10', buffered: 5000, frozen: 1 });
  });

  it('extends to a month created later', async () => {
    await setup();

    await createBudget([...WINDOW, '2027-01']);
    await setBudget({ category: 'bills', month: '2027-01', amount: 40000 });
    await sheet.waitOnSpreadsheet();

    expect(await buffer('2026-12')).toBe(40000);
    expect(await buffer('2026-11')).toBe(90000);
    expect(await buffer('2026-10')).toBe(240000);
  });

  it('follows transactions in a future month', async () => {
    await setup();

    await db.insertTransaction({
      id: 'nov',
      date: '2026-11-05',
      amount: 100000,
      account: 'account',
      category: 'income',
    });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(100000);

    await db.updateTransaction({ id: 'nov', category: 'card' });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(200000);

    await db.updateTransaction({ id: 'nov', category: 'income' });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(100000);

    await db.deleteTransaction({ id: 'nov' });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(200000);
  });

  it('follows bulk budget actions', async () => {
    await setup();
    // Averages only count closed months
    await createBudget(['2026-09', ...WINDOW]);
    await db.insertTransaction({
      date: '2026-09-05',
      amount: -90000,
      account: 'account',
      category: 'bills',
    });
    await sheet.waitOnSpreadsheet();

    await set3MonthAvg({ month: '2026-11' });
    await sheet.waitOnSpreadsheet();
    expect(await getSheetValue('budget202611', 'total-budgeted')).toBe(-90000);
    expect(await buffer('2026-10')).toBe(140000);

    await copyUntilYearEnd({ month: '2026-10', category: 'bills' });
    await sheet.waitOnSpreadsheet();
    expect(await buffer('2026-10')).toBe(520000);
  });

  it('reads the preference on a warm open', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'future-buffer-'));
    const fileDb = { ...db, getDatabasePath: () => join(dir, 'db.sqlite') };

    async function open() {
      await sheet.loadSpreadsheet(fileDb);
      sheet.get().meta().budgetType = 'envelope';
      await createBudget(WINDOW);
      await loadFutureBufferStart();
      await sheet.waitOnSpreadsheet();
    }

    try {
      global.currentMonth = '2026-10';
      await createCategories();
      await budgetBase();
      // The kvcache is only used outside tests, and lives next to the database
      vi.stubEnv('NODE_ENV', 'development');
      await open();
      expect(await buffer('2026-10')).toBe(0);
      sheet.unloadSpreadsheet();

      // Written while the budget is closed, so no change handler sees it
      db.runQuery(
        "INSERT INTO preferences (id, value) VALUES ('futureBufferMode', '2026-10')",
      );
      // `loadUserBudgets` reads the budget rows through the passed database
      const loadUserBudgets = vi.spyOn(fileDb, 'all');
      await open();

      expect(loadUserBudgets).not.toHaveBeenCalled();
      expect(sheet.getCellValue('__global', 'future-buffer-start')).toBe(
        '2026-10',
      );
      expect(await buffer('2026-10')).toBe(200000);
      expect(await toBudget('2026-10')).toBe(20000);
    } finally {
      sheet.unloadSpreadsheet();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

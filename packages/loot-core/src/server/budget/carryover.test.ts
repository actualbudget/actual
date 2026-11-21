import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { receiveMessages, setSyncingMode } from '#server/sync';
import type { Message } from '#server/sync';
import { rangeInclusive } from '#shared/months';

import {
  getSheetBoolean,
  getSheetValue,
  setBudget,
  setCategoryCarryover,
} from './actions';
import { createAllBudgets, createBudget } from './base';

vi.mock('#server/post');
beforeEach(global.emptyDatabase());
afterEach(() => {
  global.currentMonth = null;
  setSyncingMode('disabled');
});

async function setup(budgetType: 'envelope' | 'tracking') {
  await db.update('preferences', { id: 'budgetType', value: budgetType });
  await db.insertAccount({ id: 'account', name: 'Account' });
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategoryGroup({ id: 'income', name: 'Income', is_income: 1 });
  await db.insertCategory({ id: 'card', name: 'Card', cat_group: 'group' });
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = budgetType;
}

it('keeps rollover runs written by older versions ending where they did', async () => {
  await setup('envelope');
  await createBudget(rangeInclusive('2026-01', '2026-06'));
  // An older version switched rollover on in January with March as the last
  // created month, so it wrote a 1 for January to March.
  for (const month of [202601, 202602, 202603]) {
    await db.insert('zero_budgets', {
      id: `${month}-card`,
      month,
      category: 'card',
      carryover: 1,
    });
  }
  await db.insertTransaction({
    date: '2026-03-15',
    amount: -1000,
    account: 'account',
    category: 'card',
  });
  await db.insertTransaction({
    date: '2026-04-15',
    amount: -5000,
    account: 'account',
    category: 'card',
  });
  // Budgeting May creates its row without a flag
  await setBudget({ category: 'card', month: '2026-05', amount: 0 });
  await sheet.waitOnSpreadsheet();

  expect(await getSheetBoolean('budget202603', 'carryover-card')).toBe(true);
  expect(await getSheetBoolean('budget202604', 'carryover-card')).toBe(false);
  expect(await getSheetBoolean('budget202605', 'carryover-card')).toBe(false);
  // March's overspending rolls into April, April's doesn't roll into May
  expect(await getSheetValue('budget202604', 'leftover-card')).toBe(-6000);
  expect(await getSheetValue('budget202605', 'leftover-card')).toBe(0);
});

it.each(['envelope', 'tracking'] as const)(
  'keeps rollover switched on in later months until switched off (%s)',
  async budgetType => {
    await setup(budgetType);
    const table =
      budgetType === 'envelope' ? 'zero_budgets' : 'reflect_budgets';
    await createBudget(['2026-01']);
    await setCategoryCarryover({
      startMonth: '2026-01',
      category: 'card',
      flag: true,
    });
    await createBudget(rangeInclusive('2026-01', '2027-04'));
    // A month budgeted later, and an older version switching rollover on
    // in one month, both continue the run
    await setBudget({ category: 'card', month: '2027-01', amount: 5000 });
    await db.insert(table, {
      id: '202606-card',
      month: 202606,
      category: 'card',
      carryover: 1,
    });
    await sheet.waitOnSpreadsheet();
    expect(await getSheetBoolean('budget202702', 'carryover-card')).toBe(true);

    await setCategoryCarryover({
      startMonth: '2027-02',
      category: 'card',
      flag: false,
    });
    await sheet.waitOnSpreadsheet();
    expect(await getSheetBoolean('budget202701', 'carryover-card')).toBe(true);
    expect(await getSheetBoolean('budget202702', 'carryover-card')).toBe(false);
    expect(await getSheetBoolean('budget202704', 'carryover-card')).toBe(false);
  },
);

it('keeps rollover on when a budget opens after its last created month', async () => {
  global.currentMonth = '2026-01';
  await setup('envelope');
  await createAllBudgets();
  await setCategoryCarryover({
    startMonth: '2026-01',
    category: 'card',
    flag: true,
  });

  // A deleted category's older toggle keeps its rows but has no cells
  db.runQuery(
    "INSERT INTO categories (id, name, cat_group, tombstone) VALUES ('old', 'Old', 'group', 1)",
  );
  db.runQuery(
    "INSERT INTO zero_budgets (id, month, category, carryover) VALUES ('202001-old', 202001, 'old', 2)",
  );

  // Reopen two years later, with no transactions to extend the range back
  global.currentMonth = '2028-01';
  await sheet.loadSpreadsheet(db);
  expect((await createAllBudgets()).start).toBe('2025-10');
  await sheet.waitOnSpreadsheet();
  expect(await getSheetBoolean('budget202801', 'carryover-card')).toBe(true);
});

it('keeps a peer rollover starting in the former blank month', async () => {
  global.currentMonth = '2026-05';
  await setup('envelope');
  await createAllBudgets();
  // January is initially the blank month, before the first created month.
  setSyncingMode('enabled');
  await receiveMessages(
    Object.entries({ month: 202601, category: 'card', carryover: 2 }).map(
      ([column, value], i) => ({
        dataset: 'zero_budgets',
        row: '202601-card',
        column,
        value,
        timestamp: new Timestamp(Date.now() - 60000 + i, 0, '000000000000000a'),
      }),
    ),
  );
  await createAllBudgets();
  await db.insertTransaction({
    date: '2026-01-15',
    amount: -2000,
    account: 'account',
    category: 'card',
  });
  await sheet.waitOnSpreadsheet();

  expect({
    januaryRollover: await getSheetBoolean('budget202601', 'carryover-card'),
    mayRollover: await getSheetBoolean('budget202605', 'carryover-card'),
    mayBalance: await getSheetValue('budget202605', 'leftover-card'),
  }).toEqual({ januaryRollover: true, mayRollover: true, mayBalance: -2000 });
});

it('preserves a peer flag regardless of delivery order or batching', async () => {
  setSyncingMode('enabled');
  let time = Date.now() - 60000;
  for (const dataset of ['zero_budgets', 'reflect_budgets']) {
    for (let order = 0; order < 4; order++) {
      const row = `20270${order + 1}-card`;
      const message = (column: string, value: number): Message => ({
        dataset,
        row,
        column,
        value,
        timestamp: new Timestamp(time++, 0, '000000000000000a'),
      });
      const flag = message('carryover', 0);
      const amount = message('amount', 5000);
      const messages = order % 2 ? [amount, flag] : [flag, amount];
      const batches = order < 2 ? messages.map(m => [m]) : [messages];
      for (const batch of batches) await receiveMessages(batch);
      expect(
        await db.first(`SELECT carryover FROM ${dataset} WHERE id = ?`, [row]),
      ).toEqual({ carryover: 0 });
    }
  }
});

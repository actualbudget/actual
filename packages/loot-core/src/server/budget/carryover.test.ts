import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { receiveMessages, setSyncingMode } from '#server/sync';
import type { Message } from '#server/sync';
import { rangeInclusive } from '#shared/months';

import { getSheetBoolean, setBudget, setCategoryCarryover } from './actions';
import { createBudget } from './base';
import { seedCarryoverChain } from './carryover-seed';

vi.mock('#server/post');
beforeEach(global.emptyDatabase());
afterEach(() => {
  global.currentMonth = null;
  setSyncingMode('disabled');
});

it.each(['envelope', 'tracking'] as const)(
  'inherits rollover past twelve months until switched off (%s)',
  async budgetType => {
    await db.update('preferences', { id: 'budgetType', value: budgetType });
    await db.insertCategoryGroup({ id: 'group', name: 'Group' });
    await db.insertCategoryGroup({
      id: 'income',
      name: 'Income',
      is_income: 1,
    });
    await db.insertCategory({ id: 'card', name: 'Card', cat_group: 'group' });
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().budgetType = budgetType;
    await createBudget(['2026-01']);
    await setCategoryCarryover({
      startMonth: '2026-01',
      category: 'card',
      flag: true,
    });
    await createBudget(rangeInclusive('2026-01', '2027-02'));
    await setBudget({ category: 'card', month: '2027-01', amount: 5000 });
    await sheet.waitOnSpreadsheet();
    expect(await getSheetBoolean('budget202702', 'carryover-card')).toBe(true);
    await setCategoryCarryover({
      startMonth: '2027-02',
      category: 'card',
      flag: false,
    });
    await sheet.waitOnSpreadsheet();
    expect(await getSheetBoolean('budget202702', 'carryover-card')).toBe(false);
  },
);

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

it('seeds expired windows once, preserving explicit flags and the open chain', async () => {
  global.currentMonth = '2026-07';
  for (const table of ['zero_budgets', 'reflect_budgets']) {
    db.runQuery(`INSERT INTO ${table} (id, month, category, carryover) VALUES
      ('202601-card', 202601, 'card', 1), ('202602-card', 202602, 'card', 0),
      ('202603-card', 202603, 'card', 1), ('202606-card', 202606, 'card', 1)`);
  }
  await seedCarryoverChain();
  for (const table of ['zero_budgets', 'reflect_budgets']) {
    expect(
      await db.all(`SELECT month, carryover FROM ${table} ORDER BY month`),
    ).toEqual([
      { month: 202601, carryover: 1 },
      { month: 202602, carryover: 0 },
      { month: 202603, carryover: 1 },
      { month: 202604, carryover: 0 },
      { month: 202606, carryover: 1 },
    ]);
    db.runQuery(`DELETE FROM ${table} WHERE month = 202604`);
  }
  await seedCarryoverChain();
  expect(
    await db.first('SELECT id FROM zero_budgets WHERE month = 202604'),
  ).toBeNull();
});

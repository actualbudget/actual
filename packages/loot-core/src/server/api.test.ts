import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { getBankSyncError } from '#shared/errors';
import type { ServerHandlers } from '#types/server-handlers';

import { installAPI } from './api';
import { createBudget } from './budget/base';
import * as prefs from './prefs';

vi.mock('#shared/errors', () => ({
  getBankSyncError: vi.fn(error => `Bank sync error: ${error}`),
}));

describe('API handlers', () => {
  const handlers = installAPI({} as unknown as ServerHandlers);

  describe('api/bank-sync', () => {
    it('should sync a single account when accountId is provided', async () => {
      handlers['accounts-bank-sync'] = vi
        .fn()
        .mockResolvedValue({ errors: [] });

      await handlers['api/bank-sync']({ accountId: 'account1' });
      expect(handlers['accounts-bank-sync']).toHaveBeenCalledWith({
        ids: ['account1'],
      });
    });

    it('should handle errors in non batch sync', async () => {
      handlers['accounts-bank-sync'] = vi.fn().mockResolvedValue({
        errors: ['connection-failed'],
      });

      await expect(
        handlers['api/bank-sync']({ accountId: 'account2' }),
      ).rejects.toThrow('Bank sync error: connection-failed');

      expect(getBankSyncError).toHaveBeenCalledWith('connection-failed');
    });
  });

  describe('api/budget-month', () => {
    beforeEach(global.emptyDatabase());

    beforeEach(async () => {
      global.currentMonth = '2026-01';

      await sheet.loadSpreadsheet(db);
      await prefs.loadPrefs();

      await db.insertCategoryGroup({
        id: 'income-group',
        name: 'Income',
        is_income: 1,
      });
      await db.insertCategory({
        id: 'income-cat',
        name: 'Salary',
        cat_group: 'income-group',
        is_income: 1,
      });

      await db.insertAccount({ id: 'acct1', name: 'Checking' });

      handlers['get-budget-bounds'] = vi
        .fn()
        .mockResolvedValue({ start: '2026-01', end: '2026-12' });
    });

    afterEach(() => {
      global.currentMonth = null;
    });

    it('envelope budget: income group returns only received', async () => {
      await createBudget(['2026-02', '2026-03']);
      await db.insertTransaction({
        id: 'tx1',
        date: '2026-03-15',
        account: 'acct1',
        amount: 5000,
        category: 'income-cat',
      });
      await sheet.waitOnSpreadsheet();

      const result = await handlers['api/budget-month']({ month: '2026-03' });
      const group = result.categoryGroups.find(g => g.is_income);
      assert(group, 'Expected income category group to exist');

      expect(group).toHaveProperty('received', 5000);
      expect(group).not.toHaveProperty('budgeted');
      expect(group).not.toHaveProperty('balance');
      expect(group?.categories?.[0]).toHaveProperty('received', 5000);
      expect(group?.categories?.[0]).not.toHaveProperty('budgeted');
      expect(group?.categories?.[0]).not.toHaveProperty('balance');
    });

    it('tracking budget: income group returns budgeted, received, and balance', async () => {
      sheet.get().meta().budgetType = 'tracking';
      await db.update('preferences', { id: 'budgetType', value: 'tracking' });

      await createBudget(['2026-02', '2026-03']);
      sheet.get().set('budget202603!budget-income-cat', 6000);
      await db.insertTransaction({
        id: 'tx1',
        date: '2026-03-15',
        account: 'acct1',
        amount: 5000,
        category: 'income-cat',
      });
      await sheet.waitOnSpreadsheet();

      const result = await handlers['api/budget-month']({ month: '2026-03' });
      const group = result.categoryGroups.find(g => g.is_income);
      assert(group, 'Expected income category group to exist');

      expect(group).toHaveProperty('budgeted', 6000);
      expect(group).toHaveProperty('received', 5000);
      expect(group).toHaveProperty('balance', 1000);
      expect(group?.categories?.[0]).toHaveProperty('budgeted', 6000);
      expect(group?.categories?.[0]).toHaveProperty('received', 5000);
      expect(group?.categories?.[0]).toHaveProperty('balance', 1000);
      expect(group?.categories?.[0]).toHaveProperty('carryover', false);
    });
  });
});

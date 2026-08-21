import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { getBankSyncError } from '#shared/errors';
import type { ServerHandlers } from '#types/server-handlers';

import { app as accountGroupsApp } from './account-groups/app';
import { app as accountsApp } from './accounts/app';
import { installAPI } from './api';
import { createBudget } from './budget/base';
import * as prefs from './prefs';

vi.mock('#shared/errors', () => ({
  getBankSyncError: vi.fn(error => `Bank sync error: ${error}`),
}));

describe('API handlers', () => {
  const handlers = installAPI({} as unknown as ServerHandlers);

  describe('api/get-server-version', () => {
    beforeEach(() => {
      prefs.unloadPrefs();
    });

    it('does not require an open budget', async () => {
      handlers['get-server-version'] = vi
        .fn()
        .mockResolvedValue({ version: '26.6.0' });

      await expect(handlers['api/get-server-version']()).resolves.toEqual({
        version: '26.6.0',
      });
    });
  });

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

  describe('api/account-groups', () => {
    beforeEach(global.emptyDatabase());

    beforeEach(async () => {
      await prefs.loadPrefs();

      handlers['account-groups-get'] =
        accountGroupsApp.handlers['account-groups-get'];
      handlers['account-group-create'] =
        accountGroupsApp.handlers['account-group-create'];
      handlers['account-group-update'] =
        accountGroupsApp.handlers['account-group-update'];
      handlers['account-group-delete'] =
        accountGroupsApp.handlers['account-group-delete'];
      handlers['accounts-get'] = accountsApp.handlers['accounts-get'];
    });

    it('round-trips account groups and exposes account_group_id on accounts', async () => {
      const id = await handlers['api/account-group-create']({
        group: { name: 'Savings' },
      });
      await expect(handlers['api/account-groups-get']()).resolves.toEqual([
        { id, name: 'Savings' },
      ]);

      await handlers['api/account-group-update']({
        id,
        fields: { name: 'ISAs' },
      });
      await expect(handlers['api/account-groups-get']()).resolves.toEqual([
        { id, name: 'ISAs' },
      ]);

      await db.insertAccount({ id: 'acct1', name: 'Marcus' });
      await handlers['api/account-update']({
        id: 'acct1',
        fields: { account_group_id: id },
      });
      const accounts = await handlers['api/accounts-get']();
      expect(accounts[0]).toMatchObject({ id: 'acct1', account_group_id: id });

      await handlers['api/account-group-delete']({ id });
      await expect(handlers['api/account-groups-get']()).resolves.toEqual([]);
      const after = await handlers['api/accounts-get']();
      expect(after[0].account_group_id).toBeNull();
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

  describe('api/rule-create', () => {
    beforeEach(global.emptyDatabase());

    beforeEach(async () => {
      await prefs.loadPrefs();
    });

    test.each(['default', null, 'pre', 'post'] as const)(
      'normalizes %s input at the API boundary',
      async stage => {
        const rule = {
          stage,
          conditionsOp: 'and' as const,
          conditions: [],
          actions: [],
        };
        const internalRule = {
          id: 'rule-id',
          ...rule,
          stage: stage === 'default' ? null : stage,
        };

        handlers['rule-add'] = vi.fn().mockResolvedValue(internalRule);

        await expect(handlers['api/rule-create']({ rule })).resolves.toEqual(
          internalRule,
        );
        expect(handlers['rule-add']).toHaveBeenCalledWith({
          ...rule,
          stage: internalRule.stage,
        });
      },
    );
  });

  describe('api/rule-update', () => {
    beforeEach(global.emptyDatabase());

    beforeEach(async () => {
      await prefs.loadPrefs();
    });

    test('normalizes default input at the API boundary', async () => {
      const rule = {
        id: 'rule-id',
        stage: 'default' as const,
        conditionsOp: 'and' as const,
        conditions: [],
        actions: [],
      };
      const internalRule = { ...rule, stage: null };

      handlers['rule-update'] = vi.fn().mockResolvedValue(internalRule);

      await expect(handlers['api/rule-update']({ rule })).resolves.toEqual(
        internalRule,
      );
      expect(handlers['rule-update']).toHaveBeenCalledWith(internalRule);
    });
  });
});

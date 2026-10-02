import type { SyncResponseWithErrors } from '#server/accounts/app';
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
  getBankSyncError: vi.fn(error => `Bank sync error: ${error.message}`),
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
    const syncResult = ({
      newTransactions = [],
      matchedTransactions = [],
      updatedAccounts = [],
      errors = [],
    }: Partial<SyncResponseWithErrors> = {}): SyncResponseWithErrors => ({
      newTransactions,
      matchedTransactions,
      updatedAccounts,
      errors,
    });

    // A real sync error is an object, and the handler reads two fields off it:
    // getBankSyncError(errors[0]) for the message and errors[0].code for the
    // code it attaches. A bare string satisfies neither.
    const syncError = {
      type: 'SyncError' as const,
      accountId: 'account2',
      message: 'connection-failed',
      category: 'ACCOUNT_NEEDS_ATTENTION',
      code: 'ACCOUNT_NEEDS_ATTENTION',
    };

    it('should sync a single account when accountId is provided', async () => {
      handlers['accounts-bank-sync'] = vi.fn().mockResolvedValue(syncResult());

      await handlers['api/bank-sync']({ accountId: 'account1' });
      expect(handlers['accounts-bank-sync']).toHaveBeenCalledWith({
        ids: ['account1'],
      });
    });

    it('should handle errors in non batch sync', async () => {
      handlers['accounts-bank-sync'] = vi
        .fn()
        .mockResolvedValue(syncResult({ errors: [syncError] }));

      await expect(
        handlers['api/bank-sync']({ accountId: 'account2' }),
      ).rejects.toThrow('Bank sync error: connection-failed');

      expect(getBankSyncError).toHaveBeenCalledWith(syncError);
    });

    it('attaches the error code to the thrown error', async () => {
      handlers['accounts-bank-sync'] = vi
        .fn()
        .mockResolvedValue(syncResult({ errors: [syncError] }));

      await expect(
        handlers['api/bank-sync']({ accountId: 'account2' }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_NEEDS_ATTENTION' });
    });

    it('returns what the sync reconciled for a single account', async () => {
      handlers['accounts-bank-sync'] = vi.fn().mockResolvedValue(
        syncResult({
          newTransactions: ['t1', 't2'],
          matchedTransactions: ['t3'],
          updatedAccounts: ['account1'],
        }),
      );

      await expect(
        handlers['api/bank-sync']({ accountId: 'account1' }),
      ).resolves.toEqual({
        newTransactions: ['t1', 't2'],
        matchedTransactions: ['t3'],
        updatedAccounts: ['account1'],
      });
    });

    it('returns empty arrays when a sync reconciled nothing', async () => {
      handlers['accounts-bank-sync'] = vi.fn().mockResolvedValue(syncResult());

      // The caller has to be able to tell this apart from a sync that imported
      // something; both are successful, so an error is not the signal.
      await expect(
        handlers['api/bank-sync']({ accountId: 'account1' }),
      ).resolves.toEqual({
        newTransactions: [],
        matchedTransactions: [],
        updatedAccounts: [],
      });
    });

    it('merges results across both paths of a batch sync', async () => {
      handlers['accounts-get'] = vi.fn().mockResolvedValue([
        { id: 'simplefin1', account_sync_source: 'simpleFin' },
        { id: 'gocardless1', account_sync_source: 'goCardless' },
      ]);
      handlers['simplefin-batch-sync'] = vi.fn().mockResolvedValue([
        {
          accountId: 'simplefin1',
          res: syncResult({
            newTransactions: ['sf1'],
            updatedAccounts: ['simplefin1'],
          }),
        },
      ]);
      handlers['accounts-bank-sync'] = vi.fn().mockResolvedValue(
        syncResult({
          newTransactions: ['gc1'],
          matchedTransactions: ['gc2'],
          updatedAccounts: ['gocardless1'],
        }),
      );

      await expect(handlers['api/bank-sync']()).resolves.toEqual({
        newTransactions: ['sf1', 'gc1'],
        matchedTransactions: ['gc2'],
        updatedAccounts: ['simplefin1', 'gocardless1'],
      });

      // SimpleFIN accounts go through their own batch endpoint and must not be
      // synced a second time by the generic path.
      expect(handlers['accounts-bank-sync']).toHaveBeenCalledWith({
        ids: ['gocardless1'],
      });
    });

    it('still throws on error rather than returning partial results', async () => {
      handlers['accounts-get'] = vi
        .fn()
        .mockResolvedValue([
          { id: 'gocardless1', account_sync_source: 'goCardless' },
        ]);
      handlers['accounts-bank-sync'] = vi.fn().mockResolvedValue(
        syncResult({
          newTransactions: ['gc1'],
          errors: [syncError],
        }),
      );

      await expect(handlers['api/bank-sync']()).rejects.toThrow(
        'Bank sync error: connection-failed',
      );
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

  describe('api/account-create', () => {
    beforeEach(global.emptyDatabase());
    beforeEach(() => prefs.loadPrefs());

    it.each([
      [undefined, 1234],
      [0, -1234],
      [2, 1234],
      [3, 1234],
    ])(
      'passes raw integer input through at recorded precision %s',
      async (precision, initialBalance) => {
        if (precision !== undefined) {
          await prefs.savePrefs({
            amountEncoding: JSON.stringify({
              version: 1,
              currencyCode: 'USD',
              precision,
            }),
          });
        }
        handlers['account-create'] = vi.fn().mockResolvedValue('account-id');

        await handlers['api/account-create']({
          account: { name: 'Checking' },
          initialBalance,
        });

        expect(handlers['account-create']).toHaveBeenCalledWith({
          name: 'Checking',
          offBudget: undefined,
          closed: undefined,
          currency: undefined,
          balanceInteger: initialBalance,
        });
      },
    );

    it('rejects noninteger API balances', async () => {
      await expect(
        handlers['api/account-create']({
          account: { name: 'Checking' },
          initialBalance: 1.5,
        }),
      ).rejects.toThrow('Invalid initial balance');
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

    it.each(['envelope', 'tracking'] as const)(
      '%s budget: wraps every amount in Money when asked',
      async budgetType => {
        await db.update('preferences', {
          id: 'defaultCurrencyCode',
          value: 'KWD',
        });
        if (budgetType === 'tracking') {
          sheet.get().meta().budgetType = 'tracking';
          await db.update('preferences', {
            id: 'budgetType',
            value: 'tracking',
          });
        }
        await db.insertCategoryGroup({ id: 'expense-group', name: 'Bills' });
        await db.insertCategory({
          id: 'expense-cat',
          name: 'Rent',
          cat_group: 'expense-group',
        });
        await createBudget(['2026-02', '2026-03']);
        sheet.get().set('budget202603!budget-expense-cat', 3000);
        await db.insertTransaction({
          id: 'tx1',
          date: '2026-03-15',
          account: 'acct1',
          amount: 5000,
          category: 'income-cat',
        });
        await db.insertTransaction({
          id: 'tx2',
          date: '2026-03-16',
          account: 'acct1',
          amount: -1250,
          category: 'expense-cat',
        });
        await sheet.waitOnSpreadsheet();

        const raw = await handlers['api/budget-month']({ month: '2026-03' });
        const money = await handlers['api/budget-month']({
          month: '2026-03',
          options: { amountFormat: 'money' },
        });

        const wrap = (value: unknown) => ({
          amount: value ?? 0,
          currencyCode: 'KWD',
        });
        for (const key of [
          'incomeAvailable',
          'lastMonthOverspent',
          'forNextMonth',
          'totalBudgeted',
          'toBudget',
          'fromLastMonth',
          'totalIncome',
          'totalSpent',
          'totalBalance',
        ] as const) {
          expect(money[key]).toEqual(wrap(raw[key]));
        }
        raw.categoryGroups.forEach((group, i) => {
          const moneyGroup = money.categoryGroups[i];
          for (const key of ['budgeted', 'spent', 'received', 'balance']) {
            if (key in group) {
              expect(moneyGroup[key]).toEqual(wrap(group[key]));
            }
          }
          group.categories?.forEach((cat, j) => {
            const moneyCat = moneyGroup.categories?.[j];
            for (const key of ['budgeted', 'spent', 'received', 'balance']) {
              if (key in cat) {
                expect(moneyCat?.[key]).toEqual(wrap(cat[key]));
              }
            }
            if ('carryover' in cat) {
              expect(moneyCat?.carryover).toBe(cat.carryover);
            }
          });
        });
        const expense = money.categoryGroups.find(
          g => g.id === 'expense-group',
        );
        expect(expense?.categories?.[0]).toMatchObject({
          budgeted: { amount: 3000, currencyCode: 'KWD' },
          spent: { amount: -1250, currencyCode: 'KWD' },
        });
      },
    );
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

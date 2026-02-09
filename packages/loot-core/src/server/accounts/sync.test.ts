// @ts-strict-ignore
import * as monthUtils from '../../shared/months';
import * as asyncStorage from '../../platform/server/asyncStorage';
import { type SyncedPrefs } from '../../types/prefs';
import * as db from '../db';
import { loadMappings } from '../db/mappings';
import { post } from '../post';
import * as postModule from '../post';
import { getServer } from '../server-config';
import { insertRule, loadRules } from '../transactions/transaction-rules';

import { addTransactions, reconcileTransactions, syncAccount } from './sync';

vi.mock('../../shared/months', async () => ({
  ...(await vi.importActual('../../shared/months')),
  currentDay: vi.fn(),
  currentMonth: vi.fn(),
}));

beforeEach(async () => {
  vi.resetAllMocks();
  vi.mocked(monthUtils.currentDay).mockReturnValue('2017-10-15');
  vi.mocked(monthUtils.currentMonth).mockReturnValue('2017-10');
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

function getAllTransactions() {
  return db.all<
    db.DbViewTransactionInternal & { payee_name: db.DbPayee['name'] }
  >(
    `SELECT t.*, p.name as payee_name
       FROM v_transactions_internal t
       LEFT JOIN payees p ON p.id = t.payee
       ORDER BY date DESC, amount DESC, id
     `,
  );
}

async function prepareDatabase() {
  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 1 });
  await db.insertCategory({
    name: 'income',
    cat_group: 'group1',
    is_income: 1,
  });

  const { accounts } = await post(getServer().GOCARDLESS_SERVER + '/accounts', {
    client_id: '',
    group_id: '',
    item_id: '1',
  });
  const acct = accounts[0];

  const id = await db.insertAccount({
    id: 'one',
    account_id: acct.account_id,
    name: acct.official_name,
    balance_current: acct.balances.current,
  });
  await db.insertPayee({
    id: 'transfer-' + id,
    name: '',
    transfer_acct: id,
  });

  return { id, account_id: acct.account_id };
}

async function getAllPayees() {
  return (await db.getPayees()).filter(p => p.transfer_acct == null);
}

async function upsertPreference(id: string, value: string) {
  const existing = await db.select('preferences', id);
  if (existing) {
    await db.update('preferences', { id, value });
  } else {
    await db.insert('preferences', { id, value });
  }
}

describe('Account sync', () => {
  test('reconcile creates payees correctly', async () => {
    const { id } = await prepareDatabase();

    let payees = await getAllPayees();
    expect(payees.length).toBe(0);

    await reconcileTransactions(id, [
      { date: '2020-01-02', payee_name: 'bakkerij', amount: 4133 },
      { date: '2020-01-03', payee_name: 'kroger', amount: 5000 },
    ]);

    payees = await getAllPayees();
    expect(payees.length).toBe(2);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(2);
    expect(transactions.find(t => t.amount === 4133).payee).toBe(
      payees.find(p => p.name === 'Bakkerij').id,
    );
    expect(transactions.find(t => t.amount === 5000).payee).toBe(
      payees.find(p => p.name === 'Kroger').id,
    );
  });

  test('reconcile handles transactions with undefined fields', async () => {
    const { id: acctId } = await prepareDatabase();

    await db.insertTransaction({
      id: 'one',
      account: acctId,
      amount: 2948,
      date: '2020-01-01',
    });

    await reconcileTransactions(acctId, [
      { date: '2020-01-02' },
      { date: '2020-01-01', amount: 2948 },
    ]);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(2);
    expect(transactions).toMatchSnapshot();

    // No payees should be created
    const payees = await getAllPayees();
    expect(payees.length).toBe(0);

    // Make _at least_ the date is required
    await expect(reconcileTransactions(acctId, [{}])).rejects.toThrow(
      /`date` is required/,
    );
  });

  test('reconcile doesnt rematch deleted transactions if reimport disabled', async () => {
    const { id: acctId } = await prepareDatabase();
    const reimportKey =
      `sync-reimport-deleted-${acctId}` satisfies keyof SyncedPrefs;
    await db.update('preferences', { id: reimportKey, value: 'false' });

    await reconcileTransactions(acctId, [
      { date: '2020-01-01', imported_id: 'finid' },
    ]);

    const transactions1 = await getAllTransactions();
    expect(transactions1.length).toBe(1);

    await db.deleteTransaction(transactions1[0]);

    await reconcileTransactions(acctId, [
      { date: '2020-01-01', imported_id: 'finid' },
    ]);
    const transactions2 = await getAllTransactions();
    expect(transactions2.length).toBe(1);
    expect(transactions2).toMatchSnapshot();
  });

  test('reconcile does rematch deleted transactions by default', async () => {
    const { id: acctId } = await prepareDatabase();

    await reconcileTransactions(acctId, [
      { date: '2020-01-01', imported_id: 'finid' },
    ]);

    const transactions1 = await getAllTransactions();
    expect(transactions1.length).toBe(1);

    await db.deleteTransaction(transactions1[0]);

    await reconcileTransactions(acctId, [
      { date: '2020-01-01', imported_id: 'finid' },
    ]);
    const transactions2 = await getAllTransactions();
    expect(transactions2.length).toBe(2);
    expect(transactions2).toMatchSnapshot();
  });

  test('reconcile run rules with inferred payee', async () => {
    const { id: acctId } = await prepareDatabase();
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'group2',
    });
    const catId = await db.insertCategory({
      name: 'Food',
      cat_group: 'group2',
    });

    const payeeId = await db.insertPayee({ name: 'bakkerij' });

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'payee', value: payeeId }],
      actions: [{ op: 'set', field: 'category', value: catId }],
    });

    await reconcileTransactions(acctId, [
      { date: '2020-01-02', payee_name: 'Bakkerij', amount: 4133 },
    ]);

    const transactions = await getAllTransactions();
    // Even though the payee was inferred from the string name (no
    // renaming rules ran), it should match the above rule and set the
    // category
    expect(transactions.length).toBe(1);
    expect(transactions[0].payee).toBe(payeeId);
    expect(transactions[0].category).toBe(catId);

    // It also should not have created a payee
    const payees = await getAllPayees();
    expect(payees.length).toBe(1);
    expect(payees[0].id).toBe(payeeId);
  });

  test('reconcile avoids creating blank payees', async () => {
    const { id: acctId } = await prepareDatabase();

    await reconcileTransactions(acctId, [
      { date: '2020-01-02', payee_name: '     ', amount: 4133 },
    ]);

    const transactions = await getAllTransactions();
    // Even though the payee was inferred from the string name (no
    // renaming rules ran), it should match the above rule and set the
    // category
    expect(transactions.length).toBe(1);
    expect(transactions[0].payee).toBe(null);
    expect(transactions[0].amount).toBe(4133);
    expect(transactions[0].date).toBe(20200102);

    // It also should not have created a payee
    const payees = await getAllPayees();
    expect(payees.length).toBe(0);
  });

  test('reconcile run rules dont create unnecessary payees', async () => {
    const { id: acctId } = await prepareDatabase();

    const payeeId = await db.insertPayee({ name: 'bakkerij-renamed' });

    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'Bakkerij' }],
      actions: [{ op: 'set', field: 'payee', value: payeeId }],
    });

    await reconcileTransactions(acctId, [
      { date: '2020-01-02', payee_name: 'bakkerij', amount: 4133 },
    ]);

    const payees = await getAllPayees();
    expect(payees.length).toBe(1);
    expect(payees[0].id).toBe(payeeId);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0].payee).toBe(payeeId);
  });

  const testMapped = version => {
    test(`reconcile matches unmapped and mapped payees (${version})`, async () => {
      const { id: acctId } = await prepareDatabase();

      if (version === 'v1') {
        // This is quite complicated, but important to test. If a payee is
        // merged with another, a rule sets the payee of a transaction to
        // the updated one, make sure it still matches an existing
        // transaction that points to the old merged payee
      } else if (version === 'v2') {
        // This is similar to v1, but inverted: make sure that
        // if a rule sets the payee to an *old* payee, that it still
        // matches to a transaction with the new payee that it was merged
        // to
      }

      const payeeId1 = await db.insertPayee({ name: 'bakkerij2' });
      const payeeId2 = await db.insertPayee({ name: 'bakkerij-renamed' });

      // Insert a rule *before* payees are merged. Not that v2 would
      // fail if we inserted this rule after, because the rule would
      // set to an *old* payee but the matching would take place on a
      // *new* payee. But that's ok - it would fallback to matching
      // amount anyway, so while it loses some fidelity, it's an edge
      // case that we don't need to worry much about because the user
      // shouldn't be able able to create rules for a merged payee.
      // Unless they sync in a rule...
      await insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ op: 'is', field: 'imported_payee', value: 'Bakkerij' }],
        actions: [{ op: 'set', field: 'payee', value: payeeId2 }],
      });

      if (version === 'v1') {
        await db.mergePayees(payeeId2, [payeeId1]);
      } else if (version === 'v2') {
        await db.mergePayees(payeeId1, [payeeId2]);
      }

      await db.insertTransaction({
        id: 'one',
        account: acctId,
        amount: -2947,
        date: '2017-10-15',
        payee: payeeId1,
      });
      // It will try to match to this one first, make sure it matches
      // the above transaction though
      await db.insertTransaction({
        id: 'two',
        account: acctId,
        amount: -2947,
        date: '2017-10-17',
        payee: null,
      });

      const { updated } = await reconcileTransactions(acctId, [
        {
          date: '2017-10-17',
          payee_name: 'bakkerij',
          amount: -2947,
          imported_id: 'imported1',
        },
      ]);

      const payees = await getAllPayees();
      expect(payees.length).toBe(1);
      expect(payees[0].id).toBe(version === 'v1' ? payeeId2 : payeeId1);

      expect(updated.length).toBe(1);
      expect(updated[0]).toBe('one');

      const transactions = await getAllTransactions();
      expect(transactions.length).toBe(2);
      expect(transactions.find(t => t.id === 'one').imported_id).toBe(
        'imported1',
      );
    });
  };

  testMapped('v1');
  testMapped('v2');

  test('addTransactions simply adds transactions', async () => {
    const { id: acctId } = await prepareDatabase();

    const payeeId = await db.insertPayee({ name: 'bakkerij-renamed' });

    // Make sure it still runs rules
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'Bakkerij' }],
      actions: [{ op: 'set', field: 'payee', value: payeeId }],
    });

    const transactions = [
      {
        date: '2017-10-17',
        payee_name: 'BAKKerij',
        amount: -2947,
      },
      {
        date: '2017-10-18',
        payee_name: 'bakkERIj2',
        amount: -2947,
      },
      {
        date: '2017-10-19',
        payee_name: 'bakkerij3',
        amount: -2947,
      },
      {
        date: '2017-10-20',
        payee_name: 'BakkeriJ3',
        amount: -2947,
      },
    ];

    const added = await addTransactions(acctId, transactions);
    expect(added.length).toBe(transactions.length);

    const payees = await getAllPayees();
    expect(payees.length).toBe(3);

    const getName = id => payees.find(p => p.id === id).name;

    const allTransactions = await getAllTransactions();
    expect(allTransactions.length).toBe(4);
    expect(allTransactions.map(t => getName(t.payee))).toEqual([
      'bakkerij3',
      'bakkerij3',
      'bakkERIj2',
      'bakkerij-renamed',
    ]);
  });

  test("reconcile does not merge transactions with different 'imported_id' values", async () => {
    const { id } = await prepareDatabase();

    let payees = await getAllPayees();
    expect(payees.length).toBe(0);

    // Add first transaction
    await reconcileTransactions(id, [
      {
        date: '2024-04-05',
        amount: -1239,
        imported_payee: 'Acme Inc.',
        payee_name: 'Acme Inc.',
        imported_id: 'b85cdd57-5a1c-4ca5-bd54-12e5b56fa02c',
        notes: 'TEST TRANSACTION',
        cleared: true,
      },
    ]);

    payees = await getAllPayees();
    expect(payees.length).toBe(1);

    let transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);

    // Add second transaction
    await reconcileTransactions(id, [
      {
        date: '2024-04-06',
        amount: -1239,
        imported_payee: 'Acme Inc.',
        payee_name: 'Acme Inc.',
        imported_id: 'ca1589b2-7bc3-4587-a157-476170b383a7',
        notes: 'TEST TRANSACTION',
        cleared: true,
      },
    ]);

    payees = await getAllPayees();
    expect(payees.length).toBe(1);

    transactions = await getAllTransactions();
    expect(transactions.length).toBe(2);

    expect(
      transactions.find(
        t => t.imported_id === 'b85cdd57-5a1c-4ca5-bd54-12e5b56fa02c',
      ).amount,
    ).toBe(-1239);
    expect(
      transactions.find(
        t => t.imported_id === 'ca1589b2-7bc3-4587-a157-476170b383a7',
      ).amount,
    ).toBe(-1239);
  });

  test(
    'given an imported tx with no imported_id, ' +
      'when using fuzzy search V2, existing transaction has an imported_id, matches amount, and is within 7 days of imported tx, ' +
      'then imported tx should reconcile with existing transaction from fuzzy match',
    async () => {
      const { id } = await prepareDatabase();

      let payees = await getAllPayees();
      expect(payees.length).toBe(0);

      const existingTx = {
        date: '2024-04-05',
        amount: -1239,
        imported_payee: 'Acme Inc.',
        payee_name: 'Acme Inc.',
        imported_id: 'b85cdd57-5a1c-4ca5-bd54-12e5b56fa02c',
        notes: 'TEST TRANSACTION',
        cleared: true,
      };

      // Add transaction to represent existing transaction with imoprted_id
      await reconcileTransactions(id, [existingTx]);

      payees = await getAllPayees();
      expect(payees.length).toBe(1);

      let transactions = await getAllTransactions();
      expect(transactions.length).toBe(1);

      // Import transaction similar to existing but with different date and no imported_id
      await reconcileTransactions(id, [
        {
          ...existingTx,
          date: '2024-04-06',
          imported_id: null,
        },
      ]);

      payees = await getAllPayees();
      expect(payees.length).toBe(1);

      transactions = await getAllTransactions();
      expect(transactions.length).toBe(1);

      expect(transactions[0].amount).toBe(-1239);
    },
  );

  test(
    'given an imported tx has an imported_id, ' +
      'when not using fuzzy search V2, existing transaction has an imported_id, matches amount, and is within 7 days of imported tx, ' +
      'then imported tx should reconcile with existing transaction from fuzzy match',
    async () => {
      const { id } = await prepareDatabase();

      let payees = await getAllPayees();
      expect(payees.length).toBe(0);

      const existingTx = {
        date: '2024-04-05',
        amount: -1239,
        imported_payee: 'Acme Inc.',
        payee_name: 'Acme Inc.',
        imported_id: 'b85cdd57-5a1c-4ca5-bd54-12e5b56fa02c',
        notes: 'TEST TRANSACTION',
        cleared: true,
      };

      // Add transaction to represent existing transaction with imoprted_id
      await reconcileTransactions(id, [existingTx]);

      payees = await getAllPayees();
      expect(payees.length).toBe(1);

      let transactions = await getAllTransactions();
      expect(transactions.length).toBe(1);

      // Import transaction similar to existing but with different date and imported_id
      await reconcileTransactions(
        id,
        [
          {
            ...existingTx,
            date: '2024-04-06',
            imported_id: 'something-else-entirely',
          },
        ],
        false,
        false,
      );

      payees = await getAllPayees();
      expect(payees.length).toBe(1);

      transactions = await getAllTransactions();
      expect(transactions.length).toBe(1);

      expect(transactions[0].amount).toBe(-1239);
    },
  );

  test('bank sync resolves existing category by imported tag and assigns category id', async () => {
    const { id: acctId } = await prepareDatabase();

    await db.insertCategoryGroup({
      id: 'group-expense',
      name: 'Expenses',
      is_income: 0,
      hidden: 0,
    });
    const existingCategoryId = await db.insertCategory({
      name: 'Dining Out',
      cat_group: 'group-expense',
      is_income: 0,
    });

    await reconcileTransactions(
      acctId,
      [
        {
          booked: true,
          date: '2024-07-11',
          payeeName: 'Cafe',
          amount: -12.34,
          transactionCategory: 'dining_out',
          transactionAmount: { amount: '-12.34', currency: 'EUR' },
          transactionId: 'bunq-existing-category-1',
        },
      ],
      true,
    );

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0].category).toBe(existingCategoryId);

    const categories = await db.getCategories();
    expect(categories.filter(c => c.name === 'Dining Out').length).toBe(1);
  });

  test('bank sync auto-creates missing category in existing expense group and assigns it', async () => {
    const { id: acctId } = await prepareDatabase();

    await db.insertCategoryGroup({
      id: 'group-expense',
      name: 'Expenses',
      is_income: 0,
      hidden: 0,
    });

    await reconcileTransactions(
      acctId,
      [
        {
          booked: true,
          date: '2024-07-12',
          payeeName: 'Coffee Shop',
          amount: -8.55,
          transactionCategory: 'coffee',
          transactionAmount: { amount: '-8.55', currency: 'EUR' },
          transactionId: 'bunq-create-category-1',
        },
      ],
      true,
    );

    const categories = await db.getCategories();
    const createdCategory = categories.find(c => c.name === 'Coffee');
    expect(createdCategory).toBeTruthy();
    expect(createdCategory.cat_group).toBe('group-expense');

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0].category).toBe(createdCategory.id);
  });

  test('bank sync creates fallback default group when no expense group exists and assigns created category', async () => {
    const { id: acctId } = await prepareDatabase();

    await reconcileTransactions(
      acctId,
      [
        {
          booked: true,
          date: '2024-07-13',
          payeeName: 'Transit Operator',
          amount: -23.1,
          transactionCategory: 'transport',
          transactionAmount: { amount: '-23.10', currency: 'EUR' },
          transactionId: 'bunq-fallback-group-1',
        },
      ],
      true,
    );

    const groupedCategories = await db.getCategoriesGrouped();
    const importedGroup = groupedCategories.find(g => g.name === 'Imported');
    expect(importedGroup).toBeTruthy();
    expect(importedGroup.is_income).toBe(0);

    const createdCategory = importedGroup.categories.find(
      category => category.name === 'Transport',
    );
    expect(createdCategory).toBeTruthy();

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0].category).toBe(createdCategory.id);
  });

  test('bank sync keeps assignment skipped when import-category is disabled', async () => {
    const { id: acctId } = await prepareDatabase();

    const importCategoryKey = `sync-import-category-${acctId}` satisfies keyof SyncedPrefs;
    await upsertPreference(importCategoryKey, 'false');

    await reconcileTransactions(
      acctId,
      [
        {
          booked: true,
          date: '2024-07-14',
          payeeName: 'Grocer',
          amount: -31.42,
          transactionCategory: 'groceries',
          transactionAmount: { amount: '-31.42', currency: 'EUR' },
          transactionId: 'bunq-import-category-disabled-1',
        },
      ],
      true,
    );

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0].category).toBe(null);

    const categories = await db.getCategories();
    expect(categories.find(c => c.name === 'Groceries')).toBeUndefined();
  });

  test('bunq initial sync derives starting balance from current balance minus imported transactions', async () => {
    const localAccountId = 'bunq-local-account';
    const remoteAccountId = 'bunq-remote-account';

    await db.insertAccount({
      id: localAccountId,
      account_id: remoteAccountId,
      name: 'bunq account',
      balance_current: 0,
      account_sync_source: 'bunq',
    });

    await db.insertPayee({
      id: `transfer-${localAccountId}`,
      name: '',
      transfer_acct: localAccountId,
    });

    vi.spyOn(asyncStorage, 'getItem').mockResolvedValue('user-token');

    vi.spyOn(postModule, 'post').mockResolvedValueOnce({
      transactions: {
        all: [
          {
            booked: true,
            date: '2026-01-10',
            payeeName: 'Merchant A',
            transactionId: 'bunq-starting-balance-1',
            transactionAmount: { amount: '-12.34', currency: 'EUR' },
          },
          {
            booked: true,
            date: '2026-01-09',
            payeeName: 'Merchant B',
            transactionId: 'bunq-starting-balance-2',
            transactionAmount: { amount: '-14.48', currency: 'EUR' },
          },
        ],
        booked: [],
        pending: [],
      },
      balances: [],
      startingBalance: 7809,
      cursor: { newerId: '111' },
    });

    await syncAccount(undefined, undefined, localAccountId, remoteAccountId, '');

    const transactions = await getAllTransactions();

    expect(transactions).toHaveLength(3);

    const startingBalanceTransaction = transactions.find(
      transaction => transaction.starting_balance_flag === 1,
    );

    expect(startingBalanceTransaction?.amount).toBe(10491);

    const computedCurrentBalance = transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );

    expect(computedCurrentBalance).toBe(7809);
  });
});

// @ts-strict-ignore
import * as monthUtils from '../../shared/months';
import * as db from '../db';
import { loadMappings } from '../db/mappings';
import { post } from '../post';
import { getServer } from '../server-config';

import { reconcileTransactions, addTransactions } from './sync';
import { loadRules, insertRule } from './transaction-rules';

jest.mock('../../shared/months', () => ({
  ...jest.requireActual('../../shared/months'),
  currentDay: jest.fn(),
  currentMonth: jest.fn(),
}));

beforeEach(async () => {
  jest.resetAllMocks();
  (monthUtils.currentDay as jest.Mock).mockReturnValue('2017-10-15');
  (monthUtils.currentMonth as jest.Mock).mockReturnValue('2017-10');
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

function getAllTransactions() {
  return db.all(
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

  test('reconcile does not merge transactions with different ‘imported_id’ values', async () => {
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
});

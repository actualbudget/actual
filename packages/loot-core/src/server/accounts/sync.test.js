import * as monthUtils from '../../shared/months';
import * as db from '../db';
import { loadMappings } from '../db/mappings';
import { getServer } from '../server-config';

import {
  syncAccount,
  reconcileTransactions,
  addTransactions,
  fromPlaid
} from './sync';
import { loadRules, insertRule } from './transaction-rules';
import * as transfer from './transfer';

const snapshotDiff = require('snapshot-diff');

const { post } = require('../post');
const mockSyncServer = require('../tests/mockSyncServer');

beforeEach(async () => {
  mockSyncServer.reset();
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
     `
  );
}

function expectSnapshotWithDiffer(initialValue) {
  let currentValue = initialValue;
  expect(initialValue).toMatchSnapshot();
  return {
    expectToMatchDiff: value => {
      expect(snapshotDiff(currentValue, value)).toMatchSnapshot();
      currentValue = value;
    }
  };
}

function prepMockTransactions() {
  let mockTransactions;
  mockSyncServer.filterMockData(data => {
    const account_id = data.accounts[0].account_id;
    const transactions = data.transactions[account_id].filter(t => !t.pending);

    mockTransactions = [
      ...transactions.filter(t => t.date <= '2017-10-15'),
      ...transactions.filter(t => t.date === '2017-10-16').slice(0, 1),
      ...transactions.filter(t => t.date === '2017-10-17').slice(0, 3)
    ];

    return {
      accounts: data.accounts,
      transactions: { [account_id]: mockTransactions }
    };
  });
  return mockTransactions;
}

async function prepareDatabase() {
  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 1 });
  await db.insertCategory({
    name: 'income',
    cat_group: 'group1',
    is_income: 1
  });

  const { accounts } = await post(getServer().PLAID_SERVER + '/accounts', {
    client_id: '',
    group_id: '',
    item_id: '1'
  });
  const acct = accounts[0];

  const id = await db.insertAccount({
    id: 'one',
    account_id: acct.account_id,
    name: acct.official_name,
    balance_current: acct.balances.current
  });
  await db.insertPayee({
    id: 'transfer-' + id,
    name: '',
    transfer_acct: id
  });

  return { id, account_id: acct.account_id };
}

async function getAllPayees() {
  return (await db.getPayees()).filter(p => p.transfer_acct == null);
}

describe('Account sync', () => {
  test('reconcile creates payees correctly', async () => {
    monthUtils.currentDay = () => '2017-10-15';
    let { id } = await prepareDatabase();

    let payees = await getAllPayees();
    expect(payees.length).toBe(0);

    await reconcileTransactions(id, [
      { date: '2020-01-02', payee_name: 'bakkerij', amount: 4133 },
      { date: '2020-01-03', payee_name: 'kroger', amount: 5000 }
    ]);

    payees = await getAllPayees();
    expect(payees.length).toBe(2);

    let transactions = await getAllTransactions();
    expect(transactions.length).toBe(2);
    expect(transactions.find(t => t.amount === 4133).payee).toBe(
      payees.find(p => p.name === 'Bakkerij').id
    );
    expect(transactions.find(t => t.amount === 5000).payee).toBe(
      payees.find(p => p.name === 'Kroger').id
    );
  });

  test('reconcile matches single transaction', async () => {
    monthUtils.currentDay = () => '2017-10-15';
    let mockTransactions = prepMockTransactions();
    const { id, account_id } = await prepareDatabase();

    await syncAccount('userId', 'userKey', id, account_id, 'bank');

    // The payee can be anything, all that matters is the amount is the same
    let mockTransaction = mockTransactions.find(t => t.date === '2017-10-17');
    mockTransaction.amount = 29.47;

    let payeeId = await db.insertPayee({ name: 'macy' });
    await db.insertTransaction({
      id: 'one',
      account: id,
      amount: -2947,
      date: '2017-10-15',
      payee: payeeId
    });

    let { added, updated } = await reconcileTransactions(
      id,
      mockTransactions.filter(t => t.date >= '2017-10-15').map(fromPlaid)
    );

    expect(added.length).toBe(3);
    expect(updated.length).toBe(1);

    let transactions = await getAllTransactions();
    let transaction = transactions.find(t => t.amount === -2947);
    expect(transaction.id).toBe(updated[0]);

    // The payee has not been updated - it's still the payee that the original transaction had
    let payees = await getAllPayees();
    expect(payees.length).toBe(18);
    expect(transaction.payee).toBe(payeeId);
  });

  test('reconcile matches multiple transactions', async () => {
    monthUtils.currentDay = () => '2017-10-15';
    let mockTransactions = prepMockTransactions();
    const { id, account_id } = await prepareDatabase();

    await syncAccount('userId', 'userKey', id, account_id, 'bank');

    // These should all match, but note that the one with the payee
    // `macy` should match with the imported one with the same payee
    // name. This should happen even though other transactions with
    // the same amount are imported first, i.e. high fidelity matches
    // always win
    let mocked = mockTransactions.filter(t => t.date === '2017-10-17');
    mocked[0].name = 'Papa Johns east side';
    mocked[0].amount = 29.47;
    mocked[1].name = "Lowe's Store";
    mocked[1].amount = 29.47;
    mocked[2].name = 'macy';
    mocked[2].amount = 29.47;

    // Make sure that it macy is correctly matched from a different
    // day first, and then the other two are matched based on amount.
    // And it should never match the same transactions twice
    await db.insertTransaction({
      id: 'one',
      account: id,
      amount: -2947,
      date: '2017-10-15',
      payee: await db.insertPayee({ name: 'papa johns' })
    });
    await db.insertTransaction({
      id: 'two',
      account: id,
      amount: -2947,
      date: '2017-10-17',
      payee: await db.insertPayee({ name: 'lowes' })
    });
    await db.insertTransaction({
      id: 'three',
      account: id,
      amount: -2947,
      date: '2017-10-17',
      payee: await db.insertPayee({ name: 'macy' })
    });

    let { added, updated } = await reconcileTransactions(
      id,
      mockTransactions.filter(t => t.date >= '2017-10-15').map(fromPlaid)
    );

    let transactions = await getAllTransactions();
    expect(updated.length).toBe(3);
    expect(added.length).toBe(1);

    expect(transactions.find(t => t.id === 'one').imported_id).toBe(
      mocked[1].transaction_id
    );
    expect(transactions.find(t => t.id === 'two').imported_id).toBe(
      mocked[0].transaction_id
    );
    expect(transactions.find(t => t.id === 'three').imported_id).toBe(
      mocked[2].transaction_id
    );
  });

  test('reconcile matches multiple transactions (imported_id wins)', async () => {
    monthUtils.currentDay = () => '2017-10-15';
    let mockTransactions = prepMockTransactions();
    const { id, account_id } = await prepareDatabase();

    await syncAccount('userId', 'userKey', id, account_id, 'bank');

    let mocked = mockTransactions.filter(t => t.date === '2017-10-17');
    mocked[0].name = 'Papa Johns east side';
    mocked[0].amount = 29.47;
    mocked[1].name = "Lowe's Store";
    mocked[1].amount = 29.47;
    mocked[1].transaction_id = 'imported1';

    // Technically, the amount doesn't even matter. The
    // imported_id will always match no matter what
    await db.insertTransaction({
      id: 'one',
      account: id,
      amount: -3000,
      date: '2017-10-15',
      imported_id: 'imported1',
      payee: await db.insertPayee({ name: 'papa johns' })
    });
    await db.insertTransaction({
      id: 'two',
      account: id,
      amount: -2947,
      date: '2017-10-17',
      payee: await db.insertPayee({ name: 'lowes' })
    });

    let { added, updated } = await reconcileTransactions(
      id,
      mockTransactions.filter(t => t.date >= '2017-10-15').map(fromPlaid)
    );

    let transactions = await getAllTransactions();
    expect(updated).toEqual(['two', 'one']);
    expect(added.length).toBe(2);

    // Make sure lowes, which has the imported_id, is the one that
    // got matched with the same imported_id
    expect(transactions.find(t => t.id === 'one').imported_payee).toBe(
      "Lowe's Store"
    );
  });

  test('import never matches existing with financial ids', async () => {
    monthUtils.currentDay = () => '2017-10-15';
    let mockTransactions = prepMockTransactions();
    const { id, account_id } = await prepareDatabase();

    await syncAccount('userId', 'userKey', id, account_id, 'bank');
    let differ = expectSnapshotWithDiffer(await getAllTransactions());

    mockTransactions = mockTransactions.filter(t => t.date === '2017-10-17');
    mockTransactions[0].name = 'foo';
    mockTransactions[0].amount = 29.47;
    mockTransactions[1].name = 'bar';
    mockTransactions[1].amount = 29.47;

    // Make sure, no matter what, it never tries to match with an
    // existing transaction that already has a financial id
    await db.insertTransaction({
      id: 'one',
      account: id,
      amount: -2947,
      date: '2017-10-15',
      payee: await db.insertPayee({ name: 'foo' }),
      imported_id: 'trans1'
    });

    await db.insertTransaction({
      id: 'two',
      account: id,
      amount: -2947,
      date: '2017-10-15',
      payee: await db.insertPayee({ name: 'bar' }),
      imported_id: 'trans2'
    });

    differ.expectToMatchDiff(await getAllTransactions());

    monthUtils.currentDay = () => '2017-10-17';
    await syncAccount('userId', 'userKey', id, account_id, 'bank');

    differ.expectToMatchDiff(await getAllTransactions());
  });

  test('import updates transfers when matched', async () => {
    monthUtils.currentDay = () => '2017-10-15';
    let mockTransactions = prepMockTransactions();
    const { id, account_id } = await prepareDatabase();
    await db.insertAccount({ id: 'two', name: 'two' });
    await db.insertPayee({
      id: 'transfer-two',
      name: '',
      transfer_acct: 'two'
    });

    await syncAccount('userId', 'userKey', id, account_id, 'bank');
    let differ = expectSnapshotWithDiffer(await getAllTransactions());

    const mockTransaction = mockTransactions.find(t => t.date === '2017-10-17');
    mockTransaction.name = "#001 fenn st Macy's 33333 EMX";
    mockTransaction.amount = 29.48;

    const transactionId = await db.insertTransaction({
      id: 'one',
      account: 'two',
      amount: 2948,
      date: '2017-10-15',
      payee: 'transfer-' + id
    });
    await transfer.onInsert(await db.getTransaction(transactionId));

    differ.expectToMatchDiff(await getAllTransactions());

    monthUtils.currentDay = () => '2017-10-17';
    await syncAccount('userId', 'userKey', id, account_id, 'bank');

    // Don't use `differ.expectToMatchDiff` because there's too many
    // changes that look too confusing
    expect(await getAllTransactions()).toMatchSnapshot();
  });

  test('reconcile handles transactions with undefined fields', async () => {
    const { id: acctId } = await prepareDatabase();

    await db.insertTransaction({
      id: 'one',
      account: acctId,
      amount: 2948,
      date: '2020-01-01'
    });

    await reconcileTransactions(acctId, [
      { date: '2020-01-02' },
      { date: '2020-01-01', amount: 2948 }
    ]);

    let transactions = await getAllTransactions();
    expect(transactions.length).toBe(2);
    expect(transactions).toMatchSnapshot();

    // No payees should be created
    let payees = await getAllPayees();
    expect(payees.length).toBe(0);

    // Make _at least_ the date is required
    await expect(reconcileTransactions(acctId, [{}])).rejects.toThrow(
      /`date` is required/
    );
  });

  test('reconcile run rules with inferred payee', async () => {
    const { id: acctId } = await prepareDatabase();
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'group2'
    });
    let catId = await db.insertCategory({
      name: 'Food',
      cat_group: 'group2'
    });

    let payeeId = await db.insertPayee({ name: 'bakkerij' });

    await insertRule({
      stage: null,
      conditions: [{ op: 'is', field: 'payee', value: payeeId }],
      actions: [{ op: 'set', field: 'category', value: catId }]
    });

    await reconcileTransactions(acctId, [
      { date: '2020-01-02', payee_name: 'Bakkerij', amount: 4133 }
    ]);

    let transactions = await getAllTransactions();
    // Even though the payee was inferred from the string name (no
    // renaming rules ran), it should match the above rule and set the
    // category
    expect(transactions.length).toBe(1);
    expect(transactions[0].payee).toBe(payeeId);
    expect(transactions[0].category).toBe(catId);

    // It also should not have created a payee
    let payees = await getAllPayees();
    expect(payees.length).toBe(1);
    expect(payees[0].id).toBe(payeeId);
  });

  test('reconcile avoids creating blank payees', async () => {
    const { id: acctId } = await prepareDatabase();

    await reconcileTransactions(acctId, [
      { date: '2020-01-02', payee_name: '     ', amount: 4133 }
    ]);

    let transactions = await getAllTransactions();
    // Even though the payee was inferred from the string name (no
    // renaming rules ran), it should match the above rule and set the
    // category
    expect(transactions.length).toBe(1);
    expect(transactions[0].payee).toBe(null);
    expect(transactions[0].amount).toBe(4133);
    expect(transactions[0].date).toBe(20200102);

    // It also should not have created a payee
    let payees = await getAllPayees();
    expect(payees.length).toBe(0);
  });

  test('reconcile run rules dont create unnecessary payees', async () => {
    const { id: acctId } = await prepareDatabase();

    let payeeId = await db.insertPayee({ name: 'bakkerij-renamed' });

    await insertRule({
      stage: null,
      conditions: [{ op: 'is', field: 'imported_payee', value: 'Bakkerij' }],
      actions: [{ op: 'set', field: 'payee', value: payeeId }]
    });

    await reconcileTransactions(acctId, [
      { date: '2020-01-02', payee_name: 'bakkerij', amount: 4133 }
    ]);

    let payees = await getAllPayees();
    expect(payees.length).toBe(1);
    expect(payees[0].id).toBe(payeeId);

    let transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0].payee).toBe(payeeId);
  });

  let testMapped = version => {
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

      let payeeId1 = await db.insertPayee({ name: 'bakkerij2' });
      let payeeId2 = await db.insertPayee({ name: 'bakkerij-renamed' });

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
        conditions: [{ op: 'is', field: 'imported_payee', value: 'Bakkerij' }],
        actions: [{ op: 'set', field: 'payee', value: payeeId2 }]
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
        payee: payeeId1
      });
      // It will try to match to this one first, make sure it matches
      // the above transaction though
      await db.insertTransaction({
        id: 'two',
        account: acctId,
        amount: -2947,
        date: '2017-10-17',
        payee: null
      });

      let { updated } = await reconcileTransactions(acctId, [
        {
          date: '2017-10-17',
          payee_name: 'bakkerij',
          amount: -2947,
          imported_id: 'imported1'
        }
      ]);

      let payees = await getAllPayees();
      expect(payees.length).toBe(1);
      expect(payees[0].id).toBe(version === 'v1' ? payeeId2 : payeeId1);

      expect(updated.length).toBe(1);
      expect(updated[0]).toBe('one');

      let transactions = await getAllTransactions();
      expect(transactions.length).toBe(2);
      expect(transactions.find(t => t.id === 'one').imported_id).toBe(
        'imported1'
      );
    });
  };

  testMapped('v1');
  testMapped('v2');

  test('addTransactions simply adds transactions', async () => {
    const { id: acctId } = await prepareDatabase();

    let payeeId = await db.insertPayee({ name: 'bakkerij-renamed' });

    // Make sure it still runs rules
    await insertRule({
      stage: null,
      conditions: [{ op: 'is', field: 'imported_payee', value: 'Bakkerij' }],
      actions: [{ op: 'set', field: 'payee', value: payeeId }]
    });

    let transactions = [
      {
        date: '2017-10-17',
        payee_name: 'BAKKerij',
        amount: -2947
      },
      {
        date: '2017-10-18',
        payee_name: 'bakkERIj2',
        amount: -2947
      },
      {
        date: '2017-10-19',
        payee_name: 'bakkerij3',
        amount: -2947
      },
      {
        date: '2017-10-20',
        payee_name: 'BakkeriJ3',
        amount: -2947
      }
    ];

    let added = await addTransactions(acctId, transactions);
    expect(added.length).toBe(transactions.length);

    let payees = await getAllPayees();
    expect(payees.length).toBe(3);

    let getName = id => payees.find(p => p.id === id).name;

    let allTransactions = await getAllTransactions();
    expect(allTransactions.length).toBe(4);
    expect(allTransactions.map(t => getName(t.payee))).toEqual([
      'bakkerij3',
      'bakkerij3',
      'bakkERIj2',
      'bakkerij-renamed'
    ]);
  });

  test('imports transactions for current day and adds latest', async () => {
    monthUtils.currentDay = () => '2017-10-15';
    monthUtils.currentMonth = () => '2017-10';

    const { id, account_id } = await prepareDatabase();

    expect((await getAllTransactions()).length).toBe(0);
    await syncAccount('userId', 'userKey', id, account_id, 'bank');
    expect(await getAllTransactions()).toMatchSnapshot();

    monthUtils.currentDay = () => '2017-10-17';

    await syncAccount('userId', 'userKey', id, account_id, 'bank');
    expect(await getAllTransactions()).toMatchSnapshot();
  });
});

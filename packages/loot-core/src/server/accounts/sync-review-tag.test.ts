import * as asyncStorage from '#platform/server/asyncStorage';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { setSyncingMode } from '#server/sync';
import { handlers } from '#server/tests/mockSyncServer';
import { insertRule, loadRules } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';

import { app as accountsApp } from './app';

vi.mock('#shared/months', async () => ({
  ...(await vi.importActual('#shared/months')),
  currentDay: vi.fn(),
  currentMonth: vi.fn(),
}));

// The mock server's handler map is untyped; widen it so tests can index it.
const mockHandlers: Record<string, unknown> = handlers;
// Installed by the test setup (src/mocks/setup.ts) but not declared globally.
const stepForwardInTime: () => void = Reflect.get(
  globalThis,
  'stepForwardInTime',
);

const PROVIDER_ACCOUNT = 'sf-account-1';
let acctId: string;

type SimpleFinTransaction = {
  booked: boolean;
  date: string;
  payeeName: string;
  transactionAmount: { amount: string };
  transactionId: string;
};

function simpleFinTransaction(
  transactionId: string,
  date: string,
  amount: string,
  payeeName: string,
): SimpleFinTransaction {
  return {
    booked: true,
    date,
    payeeName,
    transactionAmount: { amount },
    transactionId,
  };
}

const HISTORY = simpleFinTransaction('tx-0', '2017-09-28', '-5.00', 'Bakery');
const COFFEE = simpleFinTransaction('tx-a', '2017-10-02', '-12.34', 'Coffee');
const GROCER = simpleFinTransaction('tx-b', '2017-10-03', '-50.00', 'Grocer');

beforeEach(async () => {
  vi.resetAllMocks();
  vi.mocked(monthUtils.currentDay).mockReturnValue('2017-10-15');
  vi.mocked(monthUtils.currentMonth).mockReturnValue('2017-10');
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
  vi.mocked(asyncStorage.getItem).mockResolvedValue('test-token');
  acctId = await db.insertAccount({
    id: 'acct-1',
    account_id: PROVIDER_ACCOUNT,
    name: 'Checking',
    account_sync_source: 'simpleFin',
  });
  setSyncingMode('offline');
});

afterEach(() => {
  delete mockHandlers['/simplefin/transactions'];
  setSyncingMode('disabled');
});

function enableReviewTag() {
  db.runQuery(
    "INSERT INTO preferences (id, value) VALUES ('flags.reviewNewTransactions', 'true')",
  );
}

// SimpleFIN returns a rolling window, so every sync re-sends the same
// transactions.
async function sync(transactions: SimpleFinTransaction[]) {
  mockHandlers['/simplefin/transactions'] = () => ({
    [PROVIDER_ACCOUNT]: {
      transactions: { all: transactions, booked: [], pending: [] },
      balances: [],
      startingBalance: 0,
    },
    errors: {},
  });
  stepForwardInTime();
  const res = await accountsApp.handlers['simplefin-batch-sync']({
    ids: [acctId],
  });
  expect(res[0].res.errors).toHaveLength(0);
}

async function getTransactions() {
  return db.all<
    Pick<db.DbViewTransactionInternal, 'id' | 'imported_id' | 'notes'>
  >(
    `SELECT id, imported_id, notes FROM v_transactions_internal
     WHERE tombstone = 0 AND starting_balance_flag = 0
     ORDER BY date`,
  );
}

describe('bank sync review tag', () => {
  test('does not tag the history backfilled by the first sync', async () => {
    enableReviewTag();

    await sync([HISTORY]);

    const [transaction] = await getTransactions();
    expect(transaction.notes).toBeNull();
  });

  test('tags transactions that are new since the last sync', async () => {
    enableReviewTag();
    await sync([HISTORY]);

    await sync([HISTORY, COFFEE, GROCER]);

    const transactions = await getTransactions();
    expect(transactions.map(t => [t.imported_id, t.notes])).toEqual([
      ['tx-0', null],
      ['tx-a', '#unreviewed'],
      ['tx-b', '#unreviewed'],
    ]);
  });

  test('does not tag anything when the feature is off', async () => {
    await sync([HISTORY]);

    await sync([HISTORY, COFFEE]);

    const transactions = await getTransactions();
    expect(transactions.map(t => t.notes)).toEqual([null, null]);
  });

  test('a removed tag stays removed on later syncs', async () => {
    enableReviewTag();
    await sync([HISTORY]);
    await sync([HISTORY, COFFEE]);
    const coffee = (await getTransactions()).find(
      t => t.imported_id === 'tx-a',
    );
    expect(coffee?.notes).toBe('#unreviewed');
    await db.updateTransaction({ id: coffee!.id, notes: null });

    await sync([HISTORY, COFFEE]);

    const afterResync = (await getTransactions()).find(
      t => t.imported_id === 'tx-a',
    );
    expect(afterResync?.notes).toBeNull();
  });

  test('does not tag a manual transaction that sync matches', async () => {
    enableReviewTag();
    await sync([HISTORY]);
    await db.insertTransaction({
      account: acctId,
      amount: -1234,
      date: '2017-10-02',
    });

    await sync([HISTORY, COFFEE]);

    const transactions = await getTransactions();
    expect(transactions.map(t => [t.imported_id, t.notes])).toEqual([
      ['tx-0', null],
      ['tx-a', null],
    ]);
  });

  test('keeps notes set by rules and appends the tag', async () => {
    enableReviewTag();
    await sync([HISTORY]);
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'Coffee' }],
      actions: [{ op: 'set', field: 'notes', value: 'from rule' }],
    });

    await sync([HISTORY, COFFEE]);

    const coffee = (await getTransactions()).find(
      t => t.imported_id === 'tx-a',
    );
    expect(coffee?.notes).toBe('from rule #unreviewed');
  });
});

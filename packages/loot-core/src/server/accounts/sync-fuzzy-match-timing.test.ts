import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { loadRules } from '#server/transactions/transaction-rules';

import { reconcileTransactions } from './sync';

// Every transaction here is for the same amount, so each fuzzy match is
// decided purely by dates, batch order, payee and sync timing. Rows the user
// entered are `user-MM-DD`; bank transactions are `bank-MM-DD`. `ledger()`
// lists every row with the bank transaction it ended up linked to, so a
// `new-…` row is a bank transaction that failed to match (a likely duplicate).

const ACCOUNT = 'one';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
  await db.insertAccount({ id: ACCOUNT, name: 'Checking' });
  await db.insertPayee({ id: 'acme', name: 'Acme' });
});

async function enter(dates: string[], fields: { payee?: string } = {}) {
  for (const date of dates) {
    await db.insertTransaction({
      id: `user-${date.slice(5)}`,
      account: ACCOUNT,
      amount: -1000,
      date,
      ...fields,
    });
  }
}

function bank(
  date: string,
  {
    id = `bank-${date.slice(5)}`,
    payeeName = 'Other',
    booked = true,
  }: { id?: string; payeeName?: string; booked?: boolean } = {},
) {
  return {
    transactionId: id,
    date,
    payeeName,
    transactionAmount: { amount: '-10.00' },
    booked,
  };
}

// Accounts with a sync source (GoCardless, SimpleFIN, …) sync with
// strictIdChecking off, so rows already linked to a bank transaction stay
// eligible as fuzzy candidates.
function sync(
  transactions: Array<ReturnType<typeof bank>>,
  { strictIdChecking = false } = {},
) {
  return reconcileTransactions(ACCOUNT, transactions, {
    isBankSyncAccount: true,
    strictIdChecking,
  });
}

async function ledger() {
  const rows = await db.all<
    Pick<db.DbViewTransactionInternal, 'id' | 'date' | 'imported_id'>
  >(
    'SELECT id, date, imported_id FROM v_transactions_internal WHERE account = ?',
    [ACCOUNT],
  );
  return rows
    .map(row => {
      const date = db.fromDateRepr(row.date);
      const owner = row.id.startsWith('user-')
        ? row.id
        : `new-${date.slice(5)}`;
      return { date, line: `${owner} ← ${row.imported_id ?? '(none)'}` };
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.line.localeCompare(b.line),
    )
    .map(({ line }) => line);
}

describe('fuzzy matching: one bank transaction, one candidate', () => {
  test('matches on the exact date', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-12')]);
    expect(await ledger()).toEqual(['user-09-12 ← bank-09-12']);
  });

  test('matches when the bank posts 3 days after the entered date', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-15')]);
    expect(await ledger()).toEqual(['user-09-12 ← bank-09-15']);
  });

  test('matches when the bank posts 3 days before the entered date', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-09')]);
    expect(await ledger()).toEqual(['user-09-12 ← bank-09-09']);
  });

  test('matches 7 days after (window edge is inclusive)', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-19')]);
    expect(await ledger()).toEqual(['user-09-12 ← bank-09-19']);
  });

  test('does not match 8 days after', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-20')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← (none)',
      'new-09-20 ← bank-09-20',
    ]);
  });

  test('matches 7 days before (window edge is inclusive)', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-05')]);
    expect(await ledger()).toEqual(['user-09-12 ← bank-09-05']);
  });

  test('does not match 8 days before', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-04')]);
    expect(await ledger()).toEqual([
      'new-09-04 ← bank-09-04',
      'user-09-12 ← (none)',
    ]);
  });

  test('the window spans a month boundary', async () => {
    await enter(['2024-09-28']);
    await sync([bank('2024-10-04')]);
    expect(await ledger()).toEqual(['user-09-28 ← bank-10-04']);
  });

  test('a reconciled candidate still absorbs the match but is not updated', async () => {
    await db.insertTransaction({
      id: 'user-09-12',
      account: ACCOUNT,
      amount: -1000,
      date: '2024-09-12',
      reconciled: true,
    });
    await sync([bank('2024-09-12')]);
    expect(await ledger()).toEqual(['user-09-12 ← (none)']);
  });
});

describe('fuzzy matching: one bank transaction, competing candidates', () => {
  test('the closer candidate wins', async () => {
    await enter(['2024-09-10', '2024-09-13']);
    await sync([bank('2024-09-12')]);
    expect(await ledger()).toEqual([
      'user-09-10 ← (none)',
      'user-09-13 ← bank-09-12',
    ]);
  });

  test('a payee match beats a closer date match', async () => {
    await enter(['2024-09-12']);
    await enter(['2024-09-17'], { payee: 'acme' });
    await sync([bank('2024-09-12', { payeeName: 'Acme' })]);
    expect(await ledger()).toEqual([
      'user-09-12 ← (none)',
      'user-09-17 ← bank-09-12',
    ]);
  });
});

describe('fuzzy matching: two bank transactions in one sync', () => {
  test('each matches the candidate on its own date', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-12'), bank('2024-09-13')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-12',
      'user-09-13 ← bank-09-13',
    ]);
  });

  test('two same-day bank transactions for one candidate: first in batch wins', async () => {
    await enter(['2024-09-12']);
    await sync([
      bank('2024-09-12', { id: 'bank-09-12a' }),
      bank('2024-09-12', { id: 'bank-09-12b' }),
    ]);
    expect(await ledger()).toEqual([
      'new-09-12 ← bank-09-12b',
      'user-09-12 ← bank-09-12a',
    ]);
  });

  test('two same-day bank transactions for one candidate: reversed batch', async () => {
    await enter(['2024-09-12']);
    await sync([
      bank('2024-09-12', { id: 'bank-09-12b' }),
      bank('2024-09-12', { id: 'bank-09-12a' }),
    ]);
    expect(await ledger()).toEqual([
      'new-09-12 ← bank-09-12a',
      'user-09-12 ← bank-09-12b',
    ]);
  });

  test('equidistant on either side of one candidate: first in batch wins', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-10'), bank('2024-09-14')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-10',
      'new-09-14 ← bank-09-14',
    ]);
  });

  test('one candidate, closer bank transaction listed first: closer wins', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-12'), bank('2024-09-08')]);
    expect(await ledger()).toEqual([
      'new-09-08 ← bank-09-08',
      'user-09-12 ← bank-09-12',
    ]);
  });

  test('one candidate, farther bank transaction listed first: closer wins', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-08'), bank('2024-09-12')]);
    expect(await ledger()).toEqual([
      'new-09-08 ← bank-09-08',
      'user-09-12 ← bank-09-12',
    ]);
  });

  test('two candidates both in range of both bank transactions: closest pair first', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-08'), bank('2024-09-12')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-12',
      'user-09-13 ← bank-09-08',
    ]);
  });

  // The scenario raised in review on #9005.
  test('early bank transaction only in range of one candidate, listed first: both match', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-05'), bank('2024-09-12')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-05',
      'user-09-13 ← bank-09-12',
    ]);
  });

  test('early bank transaction only in range of one candidate, listed second: both match', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-12'), bank('2024-09-05')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-05',
      'user-09-13 ← bank-09-12',
    ]);
  });

  test('mirror case, bank transaction with one candidate in range listed first: both match', async () => {
    await enter(['2024-09-12', '2024-09-19']);
    await sync([bank('2024-09-11'), bank('2024-09-15')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-11',
      'user-09-19 ← bank-09-15',
    ]);
  });

  test('mirror case, bank transaction with one candidate in range listed second: both match', async () => {
    await enter(['2024-09-12', '2024-09-19']);
    await sync([bank('2024-09-15'), bank('2024-09-11')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-11',
      'user-09-19 ← bank-09-15',
    ]);
  });

  test('the payee pass claims its candidate before any date-only match', async () => {
    await enter(['2024-09-12'], { payee: 'acme' });
    await sync([bank('2024-09-12'), bank('2024-09-16', { payeeName: 'Acme' })]);
    expect(await ledger()).toEqual([
      'new-09-12 ← bank-09-12',
      'user-09-12 ← bank-09-16',
    ]);
  });
});

describe('fuzzy matching: across multiple syncs', () => {
  test('review scenario, synced between the two bank dates (bank re-sends): both match', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-05')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-05',
      'user-09-13 ← (none)',
    ]);

    await sync([bank('2024-09-05'), bank('2024-09-12')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-05',
      'user-09-13 ← bank-09-12',
    ]);
  });

  test('a re-sent transaction keeps its row regardless of batch order', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-05')]);
    await sync([bank('2024-09-12'), bank('2024-09-05')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-05',
      'user-09-13 ← bank-09-12',
    ]);
  });

  test('first sync happens before the user enters anything: nothing to match', async () => {
    await sync([bank('2024-09-05')]);
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-05'), bank('2024-09-12')]);
    expect(await ledger()).toEqual([
      'new-09-05 ← bank-09-05',
      'user-09-12 ← bank-09-12',
      'user-09-13 ← (none)',
    ]);
  });

  test('bank reports the earlier transaction late (re-sends the other): duplicate', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-12')]);
    await sync([bank('2024-09-12'), bank('2024-09-05')]);
    expect(await ledger()).toEqual([
      'new-09-05 ← bank-09-05',
      'user-09-12 ← bank-09-12',
      'user-09-13 ← (none)',
    ]);
  });

  test('pending transaction re-reported as booked under a new id relinks the same row', async () => {
    await enter(['2024-09-12']);
    await sync([bank('2024-09-10', { id: 'pending-1', booked: false })]);
    expect(await ledger()).toEqual(['user-09-12 ← pending-1']);

    await sync([bank('2024-09-12')]);
    expect(await ledger()).toEqual(['user-09-12 ← bank-09-12']);
  });

  test('pending re-reported as booked alongside a new same-amount transaction', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-12', { id: 'pending-1', booked: false })]);
    await sync([bank('2024-09-11'), bank('2024-09-12')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-12',
      'user-09-13 ← bank-09-11',
    ]);
  });

  test('bank does not re-send: a later sync steals an already-linked row', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-05')]);
    await sync([bank('2024-09-12')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-12',
      'user-09-13 ← (none)',
    ]);

    // When bank-09-05 shows up again its id is gone, so it steals the row back.
    await sync([bank('2024-09-05')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-05',
      'user-09-13 ← (none)',
    ]);
  });

  test('bank reports the earlier transaction late (no re-send): steals the row', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-12')]);
    await sync([bank('2024-09-05')]);
    expect(await ledger()).toEqual([
      'user-09-12 ← bank-09-05',
      'user-09-13 ← (none)',
    ]);
  });

  test('same late report with strictIdChecking on: linked row is protected, duplicate instead', async () => {
    await enter(['2024-09-12', '2024-09-13']);
    await sync([bank('2024-09-12')], { strictIdChecking: true });
    await sync([bank('2024-09-05')], { strictIdChecking: true });
    expect(await ledger()).toEqual([
      'new-09-05 ← bank-09-05',
      'user-09-12 ← bank-09-12',
      'user-09-13 ← (none)',
    ]);
  });
});

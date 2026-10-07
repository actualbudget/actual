import { Timestamp } from '@actual-app/crdt';

import { app as accountsApp } from '#server/accounts/app';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { createSchedule } from '#server/schedules/app';
import { applyMessages, setSyncingMode } from '#server/sync';
import { deriveAllCoupledCells } from '#server/sync/coupled-cells';
import { clearUndo, redo, undo } from '#server/undo';

import { app } from './app';
import { loadRules } from './transaction-rules';

import { batchUpdateTransactions } from '.';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const edit = app.handlers['transactions/update-foreign-entry'];
const move = app.handlers['transactions/move-foreign-entry'];
const postEntry = app.handlers['transactions/post-foreign-entry'];
const date = '2026-03-10';

type Row = {
  id: string;
  acct: string;
  amount: number;
  transaction_amount: number | null;
  amount_pair: string | null;
  date: number;
  category: string | null;
  schedule: string | null;
};

function row(id: string): Row | null {
  return db.firstSync<Row>(
    `SELECT id, acct, amount, transaction_amount, amount_pair, date, category,
       schedule FROM transactions WHERE id = ?`,
    [id],
  );
}

function expectedOf(id: string) {
  const stored = row(id)!;
  return {
    account: stored.acct,
    amount: stored.amount,
    transaction_amount: stored.transaction_amount,
    date: db.fromDateRepr(stored.date),
  };
}

async function saveRate(
  quoteCurrency: string,
  rate: string,
  on = '2016-01-01',
) {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency,
    rate,
    kind: 'standing',
    date: on,
  });
}

async function foreignRow(
  id: string,
  account: string,
  amount: number,
  native: number,
) {
  await db.insertTransaction({
    id,
    account,
    date,
    amount,
    transaction_amount: native,
  });
}

const message = (row: string, column: string, value: string | number) => {
  const timestamp = Timestamp.send();
  if (!timestamp) throw new Error('clock unavailable');
  return { dataset: 'transactions', row, column, value, timestamp };
};

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'USD',
      precision: 2,
    }),
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
  await loadRules();
  clearUndo();
  for (const account of [
    { id: 'usd', name: 'Checking' },
    { id: 'jpy', name: 'Yen', currency: 'JPY' },
    { id: 'jpy2', name: 'Yen 2', currency: 'JPY' },
    { id: 'jpyOff', name: 'Yen savings', currency: 'JPY', offbudget: 1 },
    { id: 'kwd', name: 'Dinar', currency: 'KWD' },
    { id: 'empty', name: 'Empty' },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategory({ id: 'food', name: 'Food', cat_group: 'group' });
});

describe('editing a foreign transaction', () => {
  beforeEach(() => foreignRow('t', 'jpy', -1000, -1500));

  it('writes a supplied base with the new native amount', async () => {
    expect(
      await edit({
        id: 't',
        expected: expectedOf('t'),
        transaction_amount: -3000,
        baseAmount: -2100,
      }),
    ).toEqual({ status: 'ok' });
    expect(row('t')).toMatchObject({
      amount: -2100,
      transaction_amount: -3000,
      amount_pair: '-2100:-3000@jpy',
    });
  });

  it('takes the base from a typed or saved rate, or asks for one', async () => {
    expect(
      await edit({
        id: 't',
        expected: expectedOf('t'),
        transaction_amount: -3000,
      }),
    ).toEqual({ status: 'rate-unavailable', date });
    expect(row('t')).toMatchObject({ amount: -1000 });

    expect(
      await edit({
        id: 't',
        expected: expectedOf('t'),
        transaction_amount: -3000,
        rate: '150',
        expectedBaseAmount: -1999,
      }),
    ).toEqual({ status: 'base-changed', baseAmount: -2000 });

    await edit({
      id: 't',
      expected: expectedOf('t'),
      transaction_amount: -3000,
      rate: '150',
    });
    expect(row('t')).toMatchObject({
      amount: -2000,
      transaction_amount: -3000,
    });

    // The typed rate is now saved for the date.
    await edit({
      id: 't',
      expected: expectedOf('t'),
      transaction_amount: -4500,
    });
    expect(row('t')).toMatchObject({
      amount: -3000,
      transaction_amount: -4500,
    });
  });

  it('keeps the day rate when an edit uses another rate', async () => {
    await exchangeRatesApp.handlers['exchange-rates/save']({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date,
    });
    expect(
      await edit({
        id: 't',
        expected: expectedOf('t'),
        transaction_amount: -3000,
        rate: '160',
      }),
    ).toEqual({ status: 'ok' });
    expect(row('t')).toMatchObject({
      amount: -1875,
      transaction_amount: -3000,
    });
    expect(
      db.runQuery(
        'SELECT rate, kind FROM exchange_rates WHERE tombstone = 0',
        [],
        true,
      ),
    ).toEqual([{ rate: '150', kind: 'dated' }]);
  });

  it('confirms before replacing a standing rate and writes nothing', async () => {
    await exchangeRatesApp.handlers['exchange-rates/save']({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'standing',
      date,
    });
    expect(
      await edit({
        id: 't',
        expected: expectedOf('t'),
        transaction_amount: -3000,
        rate: '160',
        saveStanding: true,
      }),
    ).toEqual({
      status: 'rate-confirmation-required',
      existing: expect.objectContaining({ rate: '150', kind: 'standing' }),
    });
    expect(row('t')).toMatchObject({ amount: -1000 });
    expect(
      db.runQuery(
        'SELECT rate, kind FROM exchange_rates WHERE tombstone = 0',
        [],
        true,
      ),
    ).toEqual([{ rate: '150', kind: 'standing' }]);
  });

  it('values a zero amount at zero, corrects valuations, and keeps pairs on date edits', async () => {
    await edit({ id: 't', expected: expectedOf('t'), transaction_amount: 0 });
    expect(row('t')).toMatchObject({ amount: 0, transaction_amount: 0 });

    await edit({
      id: 't',
      expected: expectedOf('t'),
      transaction_amount: -1500,
      baseAmount: -1000,
    });
    await edit({ id: 't', expected: expectedOf('t'), baseAmount: -1100 });
    expect(row('t')).toMatchObject({
      amount: -1100,
      transaction_amount: -1500,
    });

    await saveRate('JPY', '100');
    await edit({
      id: 't',
      expected: expectedOf('t'),
      fields: { date: '2026-03-20', notes: 'moved' },
    });
    expect(row('t')).toMatchObject({
      amount: -1100,
      transaction_amount: -1500,
      date: 20260320,
    });
  });

  it.each([
    ['account', { account: 'jpy2' }],
    ['amount', { amount: -999 }],
    ['native amount', { transaction_amount: -1499 }],
    ['date', { date: '2026-03-11' }],
  ])('rejects a stale %s', async (_field, change) => {
    expect(
      await edit({
        id: 't',
        expected: { ...expectedOf('t'), ...change },
        transaction_amount: -3000,
        baseAmount: -2000,
      }),
    ).toEqual({ status: 'stale' });
    expect(row('t')).toMatchObject({ amount: -1000 });
  });

  it('leaves transfer legs and splits to family edits', async () => {
    await postEntry({
      transaction: {
        id: 'leg',
        account: 'jpy',
        date,
        transaction_amount: -1500,
        payee: db.firstSync<{ id: string }>(
          "SELECT id FROM payees WHERE transfer_acct = 'jpy2'",
        )!.id,
      } as never,
      baseAmount: -1000,
    });
    await expect(
      edit({
        id: 'leg',
        expected: expectedOf('leg'),
        transaction_amount: -3000,
        baseAmount: -2000,
      }),
    ).rejects.toThrow('foreign-transfer-edit-unavailable');
  });

  it('never reprices stored pairs when rates change', async () => {
    await saveRate('JPY', '150', date);
    await saveRate('JPY', '100', date);
    expect(row('t')).toMatchObject({
      amount: -1000,
      transaction_amount: -1500,
    });
  });

  it('keeps generic pair writes rejected, including other values for an edited row', async () => {
    await expect(
      batchUpdateTransactions({
        updated: [{ id: 't', amount: -2000, transaction_amount: -3000 }],
      }),
    ).rejects.toThrow('foreign-edit-unavailable');
    await expect(
      db.updateTransaction(
        { id: 't', amount: -2001, transaction_amount: -3000 },
        {
          foreignEdits: new Map([
            [
              't',
              {
                action: 'update',
                expected: expectedOf('t'),
                final: {
                  account: 'jpy',
                  amount: -2000,
                  transaction_amount: -3000,
                },
              },
            ],
          ]),
        },
      ),
    ).rejects.toThrow('foreign-edit-unavailable');
    expect(row('t')).toMatchObject({ amount: -1000 });
  });

  it('undoes an edit', async () => {
    await edit({
      id: 't',
      expected: expectedOf('t'),
      transaction_amount: -3000,
      baseAmount: -2000,
    });
    await undo();
    expect(row('t')).toMatchObject({
      amount: -1000,
      transaction_amount: -1500,
      acct: 'jpy',
    });
  });
});

describe('moving a transaction across currencies', () => {
  it.each([
    ['foreign to base', 'empty', { currency: 'KWD', precision: 3 }],
    ['foreign to foreign', 'kwd', { currency: 'USD', precision: 2 }],
  ])(
    'rejects a destination whose encoding changed (%s)',
    async (_case, account, destinationEncoding) => {
      await foreignRow('t', 'jpy', -1000, -1500);
      expect(
        await move({
          id: 't',
          account,
          expected: expectedOf('t'),
          transaction_amount: -15000,
          baseAmount: -1000,
          destinationEncoding,
        }),
      ).toEqual({ status: 'stale' });
      expect(row('t')).toMatchObject({ acct: 'jpy', amount: -1000 });
    },
  );

  it('moves a budget-currency row into a foreign account', async () => {
    await saveRate('JPY', '150');
    await db.insertTransaction({
      id: 'b',
      account: 'usd',
      date,
      amount: -1000,
    });
    expect(
      await move({
        id: 'b',
        account: 'jpy',
        expected: expectedOf('b'),
        transaction_amount: -1800,
      }),
    ).toEqual({
      status: 'ok',
      baseBefore: -1000,
      baseAfter: -1200,
      scheduleUnlinked: false,
    });
    expect(row('b')).toMatchObject({
      acct: 'jpy',
      amount: -1200,
      transaction_amount: -1800,
      amount_pair: '-1200:-1800@jpy',
    });
  });

  it('moves a foreign row into the budget currency for good', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    await move({
      id: 't',
      account: 'usd',
      expected: expectedOf('t'),
      transaction_amount: -1250,
    });
    expect(row('t')).toMatchObject({
      acct: 'usd',
      amount: -1250,
      transaction_amount: null,
      amount_pair: '-1250:@usd',
    });
    // Later base edits keep the authority, so the foreign pair never returns.
    await batchUpdateTransactions({ updated: [{ id: 't', amount: -1300 }] });
    deriveAllCoupledCells();
    expect(row('t')).toMatchObject({
      acct: 'usd',
      amount: -1300,
      transaction_amount: null,
      amount_pair: '-1300:@usd',
    });
    await undo();
    await undo();
    expect(row('t')).toMatchObject({
      acct: 'jpy',
      amount: -1000,
      transaction_amount: -1500,
    });
  });

  it('moves between foreign accounts at their precisions', async () => {
    await saveRate('KWD', '0.3075');
    await foreignRow('t', 'jpy', -1000, -1500);
    await move({
      id: 't',
      account: 'kwd',
      expected: expectedOf('t'),
      transaction_amount: -3075,
    });
    expect(row('t')).toMatchObject({
      acct: 'kwd',
      amount: -1000,
      transaction_amount: -3075,
      amount_pair: '-1000:-3075@kwd',
    });
  });

  it('unlinks a schedule in another encoding and clears off-budget categories', async () => {
    const schedule = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd' },
        {
          op: 'isapprox',
          field: 'date',
          value: {
            start: date,
            frequency: 'monthly',
            patterns: [],
            skipWeekend: false,
            weekendSolveMode: 'after',
            endMode: 'never',
            endOccurrences: 1,
            endDate: date,
          },
        },
        { op: 'isapprox', field: 'amount', value: -1000 },
      ] as never,
    });
    await db.insertTransaction({
      id: 'b',
      account: 'usd',
      date,
      amount: -1000,
      category: 'food',
      schedule,
    });
    expect(
      await move({
        id: 'b',
        account: 'jpyOff',
        expected: expectedOf('b'),
        transaction_amount: -1500,
        baseAmount: -1000,
      }),
    ).toMatchObject({ status: 'ok', scheduleUnlinked: true });
    expect(row('b')).toMatchObject({
      acct: 'jpyOff',
      schedule: null,
      category: null,
    });
  });

  it('rejects stale moves and asks for a rate', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    expect(
      await move({
        id: 't',
        account: 'kwd',
        expected: { ...expectedOf('t'), amount: -1 },
        transaction_amount: -3075,
      }),
    ).toEqual({ status: 'stale' });
    expect(
      await move({
        id: 't',
        account: 'kwd',
        expected: expectedOf('t'),
        transaction_amount: -3075,
      }),
    ).toEqual({ status: 'rate-unavailable', date });
    expect(row('t')).toMatchObject({ acct: 'jpy' });
  });

  it('keeps cross-currency moves out of generic writes', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    await expect(
      batchUpdateTransactions({ updated: [{ id: 't', account: 'kwd' }] }),
    ).rejects.toThrow('account-move-currency-mismatch');
  });
});

describe('the account-bound amount authority', () => {
  it('derives the account with the amounts on load', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    db.runQuery(
      "UPDATE transactions SET acct = 'jpy2', amount = 1 WHERE id = 't'",
    );
    deriveAllCoupledCells();
    expect(row('t')).toMatchObject({ acct: 'jpy', amount: -1000 });
  });

  it.each(['move first', 'edit first'])(
    'resolves a move and a remote edit as one unit (%s)',
    async order => {
      await saveRate('KWD', '0.3075');
      await foreignRow('t', 'jpy', -1000, -1500);
      const expected = expectedOf('t');
      // Another device edited the yen row before seeing the move.
      const remote = () =>
        applyMessages([message('t', 'amount_pair', '-2000:-3000@jpy')]);
      if (order === 'edit first') await remote();
      const moved = await move({
        id: 't',
        account: 'kwd',
        expected: order === 'edit first' ? expectedOf('t') : expected,
        transaction_amount: -3075,
      });
      expect(moved).toMatchObject({ status: 'ok' });
      if (order === 'move first') await remote();
      const final = row('t')!;
      expect(
        order === 'move first'
          ? { acct: 'jpy', amount: -2000, transaction_amount: -3000 }
          : { acct: 'kwd', amount: -1000, transaction_amount: -3075 },
      ).toEqual({
        acct: final.acct,
        amount: final.amount,
        transaction_amount: final.transaction_amount,
      });
    },
  );

  it('restores an MC-3.1 authority with its account on undo', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    db.runQuery(
      "UPDATE transactions SET amount_pair = '-1000:-1500' WHERE id = 't'",
    );
    await edit({
      id: 't',
      expected: expectedOf('t'),
      transaction_amount: -3000,
      baseAmount: -2000,
    });
    // Another device moves the row to the dinar account.
    await applyMessages([
      message('t', 'acct', 'kwd'),
      message('t', 'amount_pair', '-2000:-6150@kwd'),
    ]);
    await undo();
    expect(row('t')).toMatchObject({
      acct: 'jpy',
      amount: -1000,
      transaction_amount: -1500,
    });
  });
});

describe('the account encoding lock', () => {
  it('keeps the currency once a transaction has been in the account', async () => {
    await foreignRow('t', 'jpy2', -1000, -1500);
    await move({
      id: 't',
      account: 'usd',
      expected: expectedOf('t'),
      transaction_amount: -1000,
    });
    await expect(
      accountsApp.handlers['account-update']({ id: 'jpy2', currency: 'KWD' }),
    ).rejects.toThrow('account-currency-immutable');
    // Undo returns the row under its original encoding.
    await undo();
    expect(row('t')).toMatchObject({ acct: 'jpy2', transaction_amount: -1500 });
  });

  it('is not cleared by undo', async () => {
    await accountsApp.handlers['account-update']({
      id: 'empty',
      currency: 'JPY',
    });
    await db.insertTransaction({
      id: 'x',
      account: 'empty',
      date,
      amount: -1000,
      transaction_amount: -1500,
    });
    await db.deleteTransaction({ id: 'x' });
    expect(
      db.firstSync<{ currency_locked: number }>(
        "SELECT currency_locked FROM accounts WHERE id = 'empty'",
      ),
    ).toEqual({ currency_locked: 1 });
  });

  it('rejects undo and redo of a currency change after a transaction arrives', async () => {
    await accountsApp.handlers['account-update']({
      id: 'empty',
      currency: 'JPY',
    });
    // Another device posts a yen transaction to the account.
    await applyMessages([
      message('remote', 'acct', 'empty'),
      message('remote', 'date', 20260310),
      message('remote', 'amount_pair', '-1000:-1500@empty'),
      {
        dataset: 'accounts',
        row: 'empty',
        column: 'currency_locked',
        value: 1,
        timestamp: Timestamp.send()!,
      },
    ]);
    await expect(undo()).rejects.toThrow('account-currency-immutable');
    expect(
      db.firstSync<{ currency: string | null }>(
        "SELECT currency FROM accounts WHERE id = 'empty'",
      ),
    ).toEqual({ currency: 'JPY' });
    // The cursor did not move: redo has nothing to replay.
    await redo();
    expect(
      db.firstSync<{ currency: string | null }>(
        "SELECT currency FROM accounts WHERE id = 'empty'",
      ),
    ).toEqual({ currency: 'JPY' });
  });
});

describe('the account currency lock migration', () => {
  it('locks accounts that have any transaction row', async () => {
    await db.insertTransaction({ id: 'x', account: 'usd', date, amount: -1 });
    await db.deleteTransaction({ id: 'x' });
    db.runQuery('UPDATE accounts SET currency_locked = NULL');
    const sql = await import('node:fs').then(fs =>
      fs.readFileSync(
        new URL(
          '../../../migrations/1790985600003_add_account_currency_lock.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    db.execQuery(
      sql
        .split('\n')
        .filter(line => !line.startsWith('ALTER TABLE'))
        .join('\n'),
    );
    expect(
      db.runQuery<{ id: string; currency_locked: number | null }>(
        "SELECT id, currency_locked FROM accounts WHERE id IN ('usd', 'jpy') ORDER BY id",
        [],
        true,
      ),
    ).toEqual([
      { id: 'jpy', currency_locked: null },
      { id: 'usd', currency_locked: 1 },
    ]);
  });
});

describe('foreign edit guards (inspection round 1)', () => {
  beforeEach(() => foreignRow('t', 'jpy', -1000, -1500));

  it('rejects a transfer payee in an edit', async () => {
    await expect(
      edit({
        id: 't',
        expected: expectedOf('t'),
        fields: {
          payee: db.firstSync<{ id: string }>(
            "SELECT id FROM payees WHERE transfer_acct = 'jpy2'",
          )!.id,
        },
      }),
    ).rejects.toThrow('foreign-transfer-edit-unavailable');
    expect(
      db.firstSync('SELECT 1 FROM transactions WHERE acct = ?', ['jpy2']),
    ).toBeNull();
  });

  it('rejects a payee merged into a transfer payee', async () => {
    const alias = await db.insertPayee({ name: 'Old alias' });
    const transfer = db.firstSync<{ id: string }>(
      "SELECT id FROM payees WHERE transfer_acct = 'jpy2'",
    )!.id;
    await db.update('payee_mapping', { id: alias, targetId: transfer });
    await expect(
      edit({ id: 't', expected: expectedOf('t'), fields: { payee: alias } }),
    ).rejects.toThrow('foreign-transfer-edit-unavailable');
    expect(row('t')).toMatchObject({ amount: -1000 });
    expect(
      db.firstSync('SELECT 1 FROM transactions WHERE acct = ?', ['jpy2']),
    ).toBeNull();
  });

  it('never takes the row id from the edited fields', async () => {
    await foreignRow('other', 'jpy', -1000, -1500);
    await edit({
      id: 't',
      expected: expectedOf('t'),
      transaction_amount: -3000,
      baseAmount: -2000,
      fields: { id: 'other', notes: 'only t' } as never,
    });
    expect(row('t')).toMatchObject({ amount: -2000 });
    expect(row('other')).toMatchObject({ amount: -1000 });
  });

  it('writes a budget-currency authority when the source pair has not arrived', async () => {
    db.runQuery("UPDATE transactions SET amount_pair = NULL WHERE id = 't'");
    // Messages are compared by timestamp only while syncing.
    setSyncingMode('enabled');
    onTestFinished(() => {
      setSyncingMode('disabled');
    });
    await move({
      id: 't',
      account: 'usd',
      expected: expectedOf('t'),
      transaction_amount: -1250,
    });
    // The source's older MC-3.1 authority arrives late.
    await applyMessages([
      {
        dataset: 'transactions',
        row: 't',
        column: 'amount_pair',
        value: '-1000:-1500',
        timestamp: Timestamp.parse(
          '1970-01-01T00:00:00.000Z-0000-0123456789abcdef',
        )!,
      },
    ]);
    deriveAllCoupledCells();
    expect(row('t')).toMatchObject({
      acct: 'usd',
      amount: -1250,
      transaction_amount: null,
      amount_pair: '-1250:@usd',
    });
  });

  it('reports a moved row as stale before checking its account', async () => {
    const expected = expectedOf('t');
    await move({
      id: 't',
      account: 'usd',
      expected,
      transaction_amount: -1250,
    });
    expect(
      await edit({
        id: 't',
        expected,
        transaction_amount: -3000,
        baseAmount: -2000,
      }),
    ).toEqual({ status: 'stale' });
  });
});

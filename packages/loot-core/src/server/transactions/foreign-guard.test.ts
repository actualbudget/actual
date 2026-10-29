import { Timestamp } from '@actual-app/crdt';

import * as asyncStorage from '#platform/server/asyncStorage';
import { app as accountsApp } from '#server/accounts/app';
import { addTransactions, reconcileTransactions } from '#server/accounts/sync';
import { rescaleBudget } from '#server/amount-encoding/rescale';
import { installAPI } from '#server/api';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import { app as payeesApp } from '#server/payees/app';
import { app as preferencesApp } from '#server/preferences/app';
import * as prefs from '#server/prefs';
import { createSchedule, updateSchedule } from '#server/schedules/app';
import {
  addSyncListener,
  applyMessages,
  batchMessages,
  setSyncingMode,
} from '#server/sync';
import { deriveCoupledCellsForLoad } from '#server/sync/coupled-cells';
import { replayPendingMessages } from '#server/sync/replay';
import { undo, withUndo } from '#server/undo';
import { getAccountCurrency, getBaseCurrencyLock } from '#server/util/currency';
import { q } from '#shared/query';

import { completePairPatch } from './foreign-guard';
import { mergeTransactions } from './merge';
import {
  applyActions,
  insertRule,
  loadRules,
  updateRule,
} from './transaction-rules';

import { batchUpdateTransactions } from './index';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

async function setBudget(currencyCode: string, precision: number) {
  await db.update('preferences', {
    id: 'defaultCurrencyCode',
    value: currencyCode,
  });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({ version: 1, currencyCode, precision }),
  });
}

function rows(sql: string, params: Array<string | number> = []) {
  return db.runQuery<Record<string, unknown>>(sql, params, true);
}

async function fullRows(ids: string[]) {
  const { data } = await aqlQuery(
    q('transactions')
      .filter({ id: { $oneof: ids } })
      .select('*')
      .options({ splits: 'all' }),
  );
  return data as never;
}

function tx(id: string) {
  return db.firstSync<Record<string, unknown>>(
    'SELECT acct, amount, transaction_amount, amount_pair, notes, tombstone FROM transactions WHERE id = ?',
    [id],
  );
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await setBudget('USD', 2);
  await db.insertAccount({ id: 'base', name: 'Checking' });
  await db.insertAccount({ id: 'base2', name: 'Savings' });
  // Handlers still refuse foreign currencies, so tests insert them directly.
  await db.insertAccount({ id: 'jpy', name: 'Yen', currency: 'JPY' });
  await db.insertAccount({ id: 'jpy2', name: 'Yen 2', currency: 'JPY' });
  await db.insertAccount({ id: 'kwd', name: 'Dinar', currency: 'KWD' });
  for (const account of ['base', 'base2', 'jpy', 'jpy2', 'kwd']) {
    await db.insertPayee({ name: '', transfer_acct: account });
  }
  await db.insertPayee({ id: 'payee', name: 'Shop' });
});

describe('write guard', () => {
  it('records native precision and the base lock with the account', async () => {
    expect(await getAccountCurrency('jpy')).toEqual({
      currencyCode: 'JPY',
      precision: 0,
    });
    expect(await getAccountCurrency('kwd')).toEqual({
      currencyCode: 'KWD',
      precision: 3,
    });
    expect(await getBaseCurrencyLock()).toBe('USD');
    // A later currency-table change never reinterprets recorded integers.
    db.runQuery("UPDATE accounts SET currency_precision = 2 WHERE id = 'jpy'");
    expect(await getAccountCurrency('jpy')).toEqual({
      currencyCode: 'JPY',
      precision: 2,
    });
    db.runQuery(
      "UPDATE accounts SET currency_precision = NULL WHERE id = 'jpy'",
    );
    await expect(getAccountCurrency('jpy')).rejects.toThrow(
      'account-currency-precision-missing',
    );
  });

  it('rejects native amounts in base accounts', async () => {
    await expect(
      db.insertTransaction({
        id: 't1',
        account: 'base',
        date: '2026-03-01',
        amount: 100,
        transaction_amount: 100,
      }),
    ).rejects.toThrow('native-amount-unexpected');
    await db.insertTransaction({
      id: 't2',
      account: 'base',
      date: '2026-03-01',
      amount: 100,
    });
    expect(tx('t2')).toMatchObject({ amount: 100, transaction_amount: null });
  });

  it('requires complete safe pairs for foreign inserts', async () => {
    for (const row of [
      { amount: -1000 },
      { transaction_amount: -1500 },
      { amount: -1000.5, transaction_amount: -1500 },
      { amount: -1000, transaction_amount: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
      await expect(
        db.insertTransaction({
          id: 'bad',
          account: 'jpy',
          date: '2026-03-01',
          ...row,
        }),
      ).rejects.toThrow('foreign-pair-required');
    }
    expect(tx('bad')).toBeNull();
    await db.insertTransaction({
      id: 'ok',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    expect(tx('ok')).toMatchObject({
      amount: -1000,
      transaction_amount: -1500,
      amount_pair: '-1000:-1500',
    });
  });

  it('requires both sides for foreign amount updates', async () => {
    await db.insertTransaction({
      id: 't',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await expect(
      db.updateTransaction({ id: 't', amount: -900 }),
    ).rejects.toThrow('foreign-pair-required');
    await expect(
      db.updateTransaction({ id: 't', transaction_amount: -1400 }),
    ).rejects.toThrow('foreign-pair-required');
    await db.updateTransaction({ id: 't', notes: 'lunch' });
    // Stored pairs are frozen until foreign edits; resending them is fine.
    await expect(
      db.updateTransaction({
        id: 't',
        amount: -900,
        transaction_amount: -1400,
      }),
    ).rejects.toThrow('foreign-edit-unavailable');
    await db.updateTransaction({
      id: 't',
      amount: -1000,
      transaction_amount: -1500,
    });
    expect(tx('t')).toMatchObject({
      amount: -1000,
      transaction_amount: -1500,
      amount_pair: '-1000:-1500',
      notes: 'lunch',
    });
  });

  it('allows same-currency moves and rejects cross-currency moves', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await db.insertTransaction({
      id: 'b',
      account: 'base',
      date: '2026-03-01',
      amount: -1000,
    });
    await db.updateTransaction({ id: 'f', account: 'jpy2' });
    expect(tx('f')).toMatchObject({ acct: 'jpy2' });
    await db.updateTransaction({ id: 'b', account: 'base2' });
    for (const [id, account] of [
      ['b', 'jpy'],
      ['f', 'kwd'],
      ['f', 'base'],
    ]) {
      await expect(db.updateTransaction({ id, account })).rejects.toThrow(
        'account-move-currency-mismatch',
      );
    }
  });

  it('rejects transfers involving a foreign account', async () => {
    const transferPayee = await db.first<{ id: string }>(
      "SELECT id FROM payees WHERE transfer_acct = 'jpy'",
    );
    await expect(
      db.insertTransaction({
        id: 't',
        account: 'base',
        payee: transferPayee?.id,
        date: '2026-03-01',
        amount: -1000,
      }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    const baseTransfer = await db.first<{ id: string }>(
      "SELECT id FROM payees WHERE transfer_acct = 'base'",
    );
    await expect(
      db.insertTransaction({
        id: 't',
        account: 'jpy',
        payee: baseTransfer?.id,
        date: '2026-03-01',
        amount: -1000,
        transaction_amount: -1500,
      }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
  });

  it('treats the pair authority cell as internal', async () => {
    await expect(
      db.insertTransaction({
        id: 't',
        account: 'jpy',
        date: '2026-03-01',
        amount: -1000,
        transaction_amount: -1500,
        amount_pair: '999:888',
      }),
    ).rejects.toThrow('amount-pair-internal');
    await expect(
      batchUpdateTransactions({
        updated: [{ id: 't', amount_pair: '999:888' } as never],
      }),
    ).rejects.toThrow('amount-pair-internal');
  });

  it('validates an insert reusing an existing id as an update', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await expect(
      db.insertTransaction({
        id: 'f',
        account: 'base',
        date: '2026-03-01',
        amount: -1000,
      }),
    ).rejects.toThrow('account-move-currency-mismatch');
    await db.deleteTransaction({ id: 'f' });
    await expect(
      db.insertTransaction({
        id: 'f',
        account: 'base',
        date: '2026-03-01',
        amount: -1000,
      }),
    ).rejects.toThrow('account-move-currency-mismatch');
    await expect(
      batchUpdateTransactions({
        added: [
          { id: 'dup', account: 'base', date: '2026-03-01', amount: 1 },
          { id: 'dup', account: 'base', date: '2026-03-01', amount: 2 },
        ],
      }),
    ).rejects.toThrow('transaction-id-duplicate');
    expect(tx('dup')).toBeNull();
  });

  it('rejects a whole batch before writing anything', async () => {
    await expect(
      batchUpdateTransactions({
        added: [
          { id: 'good', account: 'base', date: '2026-03-01', amount: 100 },
          { id: 'bad', account: 'jpy', date: '2026-03-01', amount: 100 },
        ],
      }),
    ).rejects.toThrow('foreign-pair-required');
    expect(tx('good')).toBeNull();
  });

  it('keeps an unchanged companion in diffed patches', () => {
    const full = {
      id: 't',
      amount: -1100,
      transaction_amount: -1500,
      account: 'jpy',
    };
    expect(completePairPatch({ id: 't', amount: -1100 }, full)).toEqual({
      id: 't',
      amount: -1100,
      transaction_amount: -1500,
    });
    expect(completePairPatch({ id: 't', notes: 'x' } as never, full)).toEqual({
      id: 't',
      notes: 'x',
    });
    expect(
      completePairPatch(
        { id: 'b', amount: 5 },
        { id: 'b', amount: 5, transaction_amount: null },
      ),
    ).toEqual({ id: 'b', amount: 5 });
  });
});

describe('request preflight', () => {
  it('rejects addTransactions before creating payees', async () => {
    await expect(
      addTransactions('jpy', [
        { date: '2026-03-01', amount: -1000, payee_name: 'Brand new' },
      ]),
    ).rejects.toThrow('foreign-pair-required');
    expect(rows("SELECT id FROM payees WHERE name = 'Brand new'")).toEqual([]);
    await addTransactions('jpy', [
      {
        date: '2026-03-01',
        amount: -1000,
        transaction_amount: -1500,
        payee_name: 'Brand new',
      },
    ]);
    expect(rows("SELECT id FROM payees WHERE name = 'Brand new'")).toHaveLength(
      1,
    );
  });

  it('rejects file import and bank sync into foreign accounts', async () => {
    await expect(
      reconcileTransactions('jpy', [
        { date: '2026-03-01', amount: -1000, payee_name: 'Import payee' },
      ]),
    ).rejects.toThrow('multicurrency-import-unavailable');
    expect(rows("SELECT id FROM payees WHERE name = 'Import payee'")).toEqual(
      [],
    );
  });

  it('rejects base-account reconciliation with native amounts before payees', async () => {
    await expect(
      reconcileTransactions('base', [
        {
          date: '2026-03-01',
          amount: -1000,
          transaction_amount: -1000,
          payee_name: 'Import payee',
        },
      ]),
    ).rejects.toThrow('native-amount-unexpected');
    expect(rows("SELECT id FROM payees WHERE name = 'Import payee'")).toEqual(
      [],
    );
    expect(rows('SELECT id FROM payee_mapping')).toHaveLength(
      rows('SELECT id FROM payees').length,
    );
  });

  it('stages payees created by rules until the request validates', async () => {
    await loadRules();
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'coffee' }],
      actions: [{ op: 'set', field: 'payee_name', value: 'Rule payee' }],
    });
    await expect(
      addTransactions('jpy', [
        { date: '2026-03-01', amount: -1000, imported_payee: 'coffee' },
      ]),
    ).rejects.toThrow('foreign-pair-required');
    expect(rows("SELECT id FROM payees WHERE name = 'Rule payee'")).toEqual([]);
    // The same rule creates its payee once the request is valid.
    await addTransactions('jpy', [
      {
        date: '2026-03-01',
        amount: -1000,
        transaction_amount: -1500,
        imported_payee: 'coffee',
      },
    ]);
    expect(
      rows("SELECT id FROM payees WHERE name = 'Rule payee'"),
    ).toHaveLength(1);
  });
});

describe('workflows awaiting later stages', () => {
  it('rejects foreign schedules', async () => {
    const conditions = (account: string) => [
      { op: 'is', field: 'account', value: account },
      {
        op: 'isapprox',
        field: 'date',
        value: {
          start: '2026-03-01',
          frequency: 'monthly',
          patterns: [],
          skipWeekend: false,
          weekendSolveMode: 'after',
          endMode: 'never',
          endOccurrences: 1,
          endDate: '2026-03-01',
        },
      },
      { op: 'is', field: 'amount', value: -1000 },
    ];
    await expect(
      createSchedule({ conditions: conditions('jpy') as never }),
    ).rejects.toThrow('multicurrency-schedule-unavailable');
    const id = await createSchedule({
      conditions: conditions('base') as never,
    });
    await expect(
      updateSchedule({
        schedule: { id },
        conditions: conditions('jpy') as never,
      }),
    ).rejects.toThrow('multicurrency-schedule-unavailable');
  });

  it('does not apply amount rule actions to foreign transactions', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await applyActions(await fullRows(['f']), [
      { op: 'set', field: 'amount', value: -1 },
      { op: 'set', field: 'notes', value: 'tagged' },
    ] as never);
    expect(tx('f')).toMatchObject({
      amount: -1000,
      transaction_amount: -1500,
      notes: 'tagged',
    });
  });

  it('applies notes-only rules to full base and foreign rows, including splits', async () => {
    // Foreign split families cannot be created locally before MC-5, but
    // may arrive through sync; seed one directly.
    for (const [id, parent, child, parentId] of [
      ['p', 1, 0, null],
      ['c', 0, 1, 'p'],
    ] as const) {
      db.runQuery(
        `INSERT INTO transactions
           (id, acct, date, amount, transaction_amount, amount_pair,
            isParent, isChild, parent_id, tombstone, sort_order)
           VALUES (?, 'jpy', 20260301, -1000, -1500, '-1000:-1500', ?, ?, ?, 0, 0)`,
        [id, parent, child, parentId],
      );
    }
    await batchUpdateTransactions({
      added: [{ id: 'b', account: 'base', date: '2026-03-01', amount: -500 }],
    });
    const full: Array<Record<string, unknown>> = await fullRows([
      'p',
      'c',
      'b',
    ]);
    expect(full.every(row => !('amount_pair' in row))).toBe(true);
    await applyActions(
      full as never,
      [{ op: 'set', field: 'notes', value: 'checked' }] as never,
    );
    expect(
      rows("SELECT notes FROM transactions WHERE id IN ('p', 'c', 'b')").map(
        r => r.notes,
      ),
    ).toEqual(['checked', 'checked', 'checked']);
  });

  it('rejects transfer target changes involving foreign accounts', async () => {
    const batchChange = payeesApp.handlers['payees-batch-change'];
    await expect(
      batchChange({ updated: [{ id: 'payee', transfer_acct: 'jpy' }] }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      payee: 'payee',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await expect(
      batchChange({ updated: [{ id: 'payee', transfer_acct: 'base' }] }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    expect(
      db.firstSync("SELECT transfer_acct FROM payees WHERE id = 'payee'"),
    ).toEqual({ transfer_acct: null });
  });

  it('preflights account closure before any side effect', async () => {
    const close = accountsApp.handlers['account-close'];
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await db.insertTransaction({
      id: 'b',
      account: 'base',
      date: '2026-03-01',
      amount: 500,
    });
    await expect(
      close({ id: 'jpy', transferAccountId: 'base' }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    await expect(
      close({ id: 'base', transferAccountId: 'jpy' }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    expect(
      rows(
        "SELECT id, closed FROM accounts WHERE id IN ('jpy', 'base') ORDER BY id",
      ),
    ).toEqual([
      { id: 'base', closed: 0 },
      { id: 'jpy', closed: 0 },
    ]);
    // A zero native balance needs no transfer.
    await db.insertTransaction({
      id: 'f2',
      account: 'jpy',
      date: '2026-03-02',
      amount: 1000,
      transaction_amount: 1500,
    });
    await close({ id: 'jpy' });
    expect(
      db.firstSync("SELECT closed FROM accounts WHERE id = 'jpy'"),
    ).toEqual({ closed: 1 });
  });

  it('completes forced deletion of transfers inside its batch', async () => {
    const baseTransfer = await db.first<{ id: string }>(
      "SELECT id FROM payees WHERE transfer_acct = 'base2'",
    );
    await batchUpdateTransactions({
      added: [
        {
          id: 'tr',
          account: 'base',
          payee: baseTransfer?.id,
          date: '2026-03-01',
          amount: -100,
        },
      ],
    });
    const counterpart = db.firstSync<{ id: string }>(
      "SELECT id FROM transactions WHERE acct = 'base2'",
    );
    await accountsApp.handlers['account-close']({ id: 'base', forced: true });
    expect(
      db.firstSync(
        'SELECT transferred_id, description FROM transactions WHERE id = ?',
        [counterpart?.id ?? ''],
      ),
    ).toEqual({ transferred_id: null, description: null });
  });

  it('merges only identical foreign pairs without children', async () => {
    const add = (id: string, transactionAmount: number) =>
      db.insertTransaction({
        id,
        account: 'jpy',
        date: '2026-03-01',
        amount: -1000,
        transaction_amount: transactionAmount,
      });
    await add('a', -1500);
    await add('b', -1600);
    await expect(mergeTransactions([{ id: 'a' }, { id: 'b' }])).rejects.toThrow(
      'multicurrency-merge-unavailable',
    );
    await add('c', -1500);
    await mergeTransactions([{ id: 'a' }, { id: 'c' }]);
  });
});

describe('base-currency lock', () => {
  it('persists through deletion and blocks every currency writer', async () => {
    await accountsApp.handlers['account-close']({ id: 'jpy', forced: true });
    await accountsApp.handlers['account-close']({ id: 'jpy2', forced: true });
    await accountsApp.handlers['account-close']({ id: 'kwd', forced: true });
    expect(await getBaseCurrencyLock()).toBe('USD');
    const save = preferencesApp.handlers['preferences/save'];
    await expect(
      save({ id: 'defaultCurrencyCode', value: 'EUR' }),
    ).rejects.toThrow('base-currency-locked');
    await save({ id: 'defaultCurrencyCode', value: 'USD' });
    await expect(
      save({ id: 'multicurrencyBaseCurrency', value: 'EUR' }),
    ).rejects.toThrow('base-currency-lock-protected');
    await expect(
      save({ id: 'multicurrencyBaseCurrency', value: undefined }),
    ).rejects.toThrow('base-currency-lock-protected');
    await expect(
      save({ id: 'defaultCurrencyCode', value: 'EUR' }),
    ).rejects.toThrow('base-currency-locked');
  });

  it('keeps the lock when the first currency-setting operation is undone', async () => {
    await global.emptyDatabase()();
    await prefs.loadPrefs();
    await setBudget('USD', 2);
    await runMutator(() =>
      withUndo(async () => {
        await db.insertAccount({ id: 'first', name: 'First', currency: 'EUR' });
      }),
    );
    expect(await getBaseCurrencyLock()).toBe('USD');
    await undo();
    expect(
      db.firstSync("SELECT tombstone FROM accounts WHERE id = 'first'"),
    ).toEqual({ tombstone: 1 });
    expect(await getBaseCurrencyLock()).toBe('USD');
  });
});

describe('native balances', () => {
  it('sums native units for foreign accounts and base units otherwise', async () => {
    await batchUpdateTransactions({
      added: [
        {
          id: 'j1',
          account: 'jpy',
          date: '2026-03-01',
          amount: -1000,
          transaction_amount: -1500,
        },
        {
          id: 'k1',
          account: 'kwd',
          date: '2026-03-01',
          amount: 32550,
          transaction_amount: 10000,
        },
        { id: 'b1', account: 'base', date: '2026-03-01', amount: 2500 },
      ],
    });
    const balance = accountsApp.handlers['account-balance'];
    const cutoff = new Date('2026-12-31');
    expect(await balance({ id: 'jpy', cutoff })).toBe(-1500);
    expect(await balance({ id: 'kwd', cutoff })).toBe(10000);
    expect(await balance({ id: 'base', cutoff })).toBe(2500);
    expect(
      db.firstSync<{ total: number }>(
        'SELECT sum(amount) AS total FROM transactions WHERE tombstone = 0',
      )?.total,
    ).toBe(34050);
  });
});

describe('coupled pairs', () => {
  const key = 'remote';
  const remoteAt = (offsetMs: number) => {
    const timestamp = Timestamp.parse(
      `${new Date(Date.now() + offsetMs).toISOString()}-0000-abcdef0123456789`,
    );
    assert(timestamp, 'Expected a valid remote timestamp');
    return timestamp;
  };
  const message = (column: string, value: string | number, offset: number) => ({
    dataset: 'transactions',
    row: key,
    column,
    value,
    timestamp: remoteAt(offset),
  });

  // Local writes need CRDT history for remote messages to compare against.
  beforeEach(() => setSyncingMode('enabled'));
  afterEach(() => setSyncingMode('disabled'));

  beforeEach(async () => {
    await db.insertTransaction({
      id: key,
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
  });

  describe('with interleaved remote cells', () => {
    it.each([
      [
        'remote pair newer',
        60_000,
        { amount: -2000, transaction_amount: -3000 },
      ],
      [
        'remote pair older',
        -60_000,
        { amount: -1000, transaction_amount: -1500 },
      ],
    ])(
      'keeps amounts from one operation when cells interleave (%s)',
      async (_, pairOffset, expected) => {
        let observed: unknown;
        const unlisten = addSyncListener((_old, newData) => {
          const row = (
            newData.get('transactions') as Map<string, unknown>
          )?.get(key);
          if (row) observed = row;
        });
        // Opposite field order: remote amount wins its cell, native loses.
        await applyMessages([
          message('amount', -2000, 60_000),
          message('transaction_amount', -3000, -60_001),
          message('amount_pair', '-2000:-3000', pairOffset + 2),
        ]);
        unlisten();
        expect(tx(key)).toMatchObject(expected);
        expect(observed).toMatchObject(expected);
      },
    );
  });

  it('derives partially delivered and replayed pairs', async () => {
    await applyMessages([
      message('amount', -5, 60_000),
      message('amount_pair', '-2000:-3000', 60_001),
    ]);
    expect(tx(key)).toMatchObject({ amount: -2000, transaction_amount: -3000 });

    db.runQuery(
      `INSERT INTO messages_pending (timestamp, dataset, row, column, value)
         VALUES (?, 'transactions', ?, 'amount_pair', 'S:-4000:-6000')`,
      ['2030-01-01T00:00:00.000Z-0000-abcdef0123456789', key],
    );
    db.runQuery(`UPDATE transactions SET amount = 1 WHERE id = ?`, [key]);
    replayPendingMessages();
    expect(tx(key)).toMatchObject({ amount: -4000, transaction_amount: -6000 });
  });

  it('ignores malformed pairs and leaves base rows untouched', async () => {
    db.runQuery("UPDATE transactions SET amount_pair = '1.5:x' WHERE id = ?", [
      key,
    ]);
    db.runQuery('UPDATE transactions SET amount = 7 WHERE id = ?', [key]);
    deriveCoupledCellsForLoad();
    expect(tx(key)).toMatchObject({ amount: 7 });
  });

  it('invalidates the warm spreadsheet cache when load derivation changes amounts', async () => {
    db.runQuery(
      "INSERT OR REPLACE INTO kvcache_key (id, key) VALUES (1, 'warm')",
    );
    deriveCoupledCellsForLoad();
    expect(rows('SELECT * FROM kvcache_key')).toHaveLength(1);
    db.runQuery('UPDATE transactions SET amount = 7 WHERE id = ?', [key]);
    deriveCoupledCellsForLoad();
    expect(rows('SELECT * FROM kvcache_key')).toEqual([]);
    expect(tx(key)).toMatchObject({ amount: -1000 });
  });

  it('keeps pairs coherent through a base precision rescale', async () => {
    await global.emptyDatabase()();
    db.execQuery(`
      INSERT INTO transactions (id, amount, transaction_amount, amount_pair)
        VALUES ('pair', 1234, 1000, '1234:1000');
      INSERT INTO transactions (id, amount, transaction_amount, amount_pair, tombstone)
        VALUES ('dead', 50, 7, '50:7', 1);
    `);
    const database = db.getDatabase();
    if (!database) throw new Error('missing test database');
    rescaleBudget(database, 2, 3);
    deriveCoupledCellsForLoad();
    expect(
      rows(
        'SELECT id, amount, transaction_amount, amount_pair FROM transactions ORDER BY id',
      ),
    ).toEqual([
      { id: 'dead', amount: 500, transaction_amount: 7, amount_pair: '500:7' },
      {
        id: 'pair',
        amount: 12340,
        transaction_amount: 1000,
        amount_pair: '12340:1000',
      },
    ]);
  });
});

describe('inspection round 1 regressions', () => {
  it('validates updates of missing ids and same-batch overlaps as inserts', async () => {
    await expect(
      db.updateTransaction({
        id: 'ghost',
        account: 'jpy',
        date: '2026-03-01',
        notes: 'x',
      }),
    ).rejects.toThrow('foreign-pair-required');
    expect(tx('ghost')).toBeNull();
    await expect(
      batchUpdateTransactions({
        added: [{ id: 'n', account: 'base', date: '2026-03-01', amount: 5 }],
        updated: [{ id: 'n', account: 'jpy' }],
      }),
    ).rejects.toThrow('foreign-pair-required');
    expect(tx('n')).toBeNull();
    await db.insertTransaction({
      id: 'b',
      account: 'base',
      date: '2026-03-01',
      amount: 5,
    });
    await expect(
      batchUpdateTransactions({
        updated: [
          { id: 'b', notes: 'one' },
          { id: 'b', notes: 'two' },
        ],
      }),
    ).rejects.toThrow('transaction-id-duplicate');
  });

  it('rejects transfer links to a foreign counterpart before writing', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await db.insertTransaction({
      id: 'b',
      account: 'base',
      date: '2026-03-01',
      amount: 1000,
    });
    const baseTransfer = await db.first<{ id: string }>(
      "SELECT id FROM payees WHERE transfer_acct = 'base2'",
    );
    await expect(
      batchUpdateTransactions({
        updated: [{ id: 'b', payee: baseTransfer?.id, transfer_id: 'f' }],
      }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    expect(
      db.firstSync(
        "SELECT description, transferred_id FROM transactions WHERE id = 'b'",
      ),
    ).toEqual({ description: null, transferred_id: null });
  });

  it('resolves merged payees when guarding transfer targets', async () => {
    await db.insertPayee({ id: 'q', name: 'Target' });
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      payee: 'payee',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await payeesApp.handlers['payees-merge']({
      targetId: 'q',
      mergeIds: ['payee'],
    });
    await expect(
      payeesApp.handlers['payees-batch-change']({
        updated: [{ id: 'q', transfer_acct: 'base' }],
      }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    const baseTransfer = await db.first<{ id: string }>(
      "SELECT id FROM payees WHERE transfer_acct = 'base'",
    );
    await expect(
      payeesApp.handlers['payees-merge']({
        targetId: baseTransfer?.id ?? '',
        mergeIds: ['q'],
      }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
  });

  it('stages payees named by manually applied actions', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await expect(
      applyActions(await fullRows(['f']), [
        { op: 'set', field: 'payee_name', value: 'Manual payee' },
        { op: 'set', field: 'account', value: 'base' },
      ] as never),
    ).rejects.toThrow('account-move-currency-mismatch');
    expect(rows("SELECT id FROM payees WHERE name = 'Manual payee'")).toEqual(
      [],
    );
    await applyActions(await fullRows(['f']), [
      { op: 'set', field: 'payee_name', value: 'Manual payee' },
    ] as never);
    expect(
      rows("SELECT id FROM payees WHERE name = 'Manual payee'"),
    ).toHaveLength(1);
  });

  it('rejects foreign bank sync without writing sync state', async () => {
    db.runQuery(
      "UPDATE accounts SET account_id = 'remote', bank = 'bank1', bank_sync_status = 'ok' WHERE id = 'jpy'",
    );
    db.runQuery(
      "INSERT INTO banks (id, bank_id, name) VALUES ('bank1', 'b', 'Bank')",
    );
    vi.mocked(asyncStorage.multiGet).mockResolvedValue({});
    const result = await accountsApp.handlers['accounts-bank-sync']({
      ids: ['jpy'],
    });
    expect(result.errors).toEqual([
      expect.objectContaining({
        accountId: 'jpy',
        message: 'multicurrency-import-unavailable',
      }),
    ]);
    expect(
      db.firstSync("SELECT bank_sync_status FROM accounts WHERE id = 'jpy'"),
    ).toEqual({ bank_sync_status: 'ok' });
  });

  it('rejects rule writes that retarget a schedule to a foreign account', async () => {
    await expect(
      insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: [{ op: 'is', field: 'account', value: 'jpy' }],
        actions: [{ op: 'link-schedule', value: 'sched' }],
      } as never),
    ).rejects.toThrow('multicurrency-schedule-unavailable');
    const scheduleId = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'base' },
        {
          op: 'isapprox',
          field: 'date',
          value: {
            start: '2026-03-01',
            frequency: 'monthly',
            patterns: [],
            skipWeekend: false,
            weekendSolveMode: 'after',
            endMode: 'never',
            endOccurrences: 1,
            endDate: '2026-03-01',
          },
        },
      ] as never,
    });
    const schedule = db.firstSync<{ rule: string }>(
      'SELECT rule FROM schedules WHERE id = ?',
      [scheduleId],
    );
    await expect(
      updateRule({
        id: schedule?.rule,
        conditions: [{ op: 'is', field: 'account', value: 'jpy' }],
      }),
    ).rejects.toThrow('multicurrency-schedule-unavailable');
  });
});

describe('inspection round 2 regressions', () => {
  it('keeps populated foreign accounts immutable, including inheritance', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await expect(
      accountsApp.handlers['account-update']({ id: 'jpy', currency: null }),
    ).rejects.toThrow('account-currency-immutable');
    await db.deleteTransaction({ id: 'f' });
    // Tombstoned history can be restored by undo, so it still counts.
    await expect(
      accountsApp.handlers['account-update']({ id: 'jpy', currency: null }),
    ).rejects.toThrow('account-currency-immutable');
    expect(await getAccountCurrency('jpy')).toMatchObject({
      currencyCode: 'JPY',
    });
  });

  it('sees accounts created earlier in the same batch', async () => {
    await expect(
      batchMessages(async () => {
        await db.insertAccount({ id: 'new', name: 'New', currency: 'EUR' });
        await db.insertTransaction({
          id: 'n',
          account: 'new',
          date: '2026-03-01',
          amount: -100,
        });
      }),
    ).rejects.toThrow('foreign-pair-required');
    expect(tx('n')).toBeNull();
  });

  it('checks counterparts proposed in the same batch', async () => {
    await expect(
      batchUpdateTransactions({
        added: [
          {
            id: 'b',
            account: 'base',
            date: '2026-03-01',
            amount: 1000,
            transfer_id: 'f',
          },
          {
            id: 'f',
            account: 'jpy',
            date: '2026-03-01',
            amount: -1000,
            transaction_amount: -1500,
          },
        ],
      }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    expect(tx('b')).toBeNull();
  });

  it('preflights closure through the generic account update', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    const handlers = installAPI({} as never);
    await expect(
      handlers['api/account-update']({ id: 'jpy', fields: { closed: true } }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    expect(
      db.firstSync("SELECT closed FROM accounts WHERE id = 'jpy'"),
    ).toEqual({ closed: 0 });
  });

  it('rejects linking a foreign account before any bank write', async () => {
    const banksBefore = rows('SELECT id FROM banks');
    await expect(
      accountsApp.handlers['simplefin-accounts-link']({
        externalAccount: {
          account_id: 'remote',
          name: 'Remote',
          institution: 'Bank',
          orgDomain: 'bank.example',
          orgId: 'org',
          balance: 0,
        } as never,
        upgradingId: 'jpy',
      }),
    ).rejects.toThrow('multicurrency-import-unavailable');
    expect(rows('SELECT id FROM banks')).toEqual(banksBefore);
    expect(
      db.firstSync("SELECT account_id FROM accounts WHERE id = 'jpy'"),
    ).toEqual({ account_id: null });
  });

  it('rejects moves between differently recorded encodings of one currency', async () => {
    db.runQuery("UPDATE accounts SET currency_precision = 2 WHERE id = 'jpy2'");
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await expect(
      db.updateTransaction({ id: 'f', account: 'jpy2' }),
    ).rejects.toThrow('account-move-currency-mismatch');
  });

  it('counts deleted foreign transactions when changing transfer targets', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      payee: 'payee',
      date: '2026-03-01',
      amount: -1000,
      transaction_amount: -1500,
    });
    await db.deleteTransaction({ id: 'f' });
    await expect(
      payeesApp.handlers['payees-batch-change']({
        updated: [{ id: 'payee', transfer_acct: 'base' }],
      }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
  });

  it('leaves malformed pair cells untouched when rescaling', async () => {
    await global.emptyDatabase()();
    db.execQuery(`
      INSERT INTO transactions (id, amount, transaction_amount, amount_pair)
        VALUES ('bad', 1234, 500, 'junk:1000:extra');
    `);
    const database = db.getDatabase();
    if (!database) throw new Error('missing test database');
    rescaleBudget(database, 2, 3);
    deriveCoupledCellsForLoad();
    expect(
      db.firstSync(
        "SELECT amount, transaction_amount, amount_pair FROM transactions WHERE id = 'bad'",
      ),
    ).toEqual({
      amount: 12340,
      transaction_amount: 500,
      amount_pair: 'junk:1000:extra',
    });
  });

  it('uses the effective schedule account in schedule and rule guards', async () => {
    const conditions = [
      { op: 'isNot', field: 'account', value: 'base' },
      { op: 'is', field: 'account', value: 'jpy' },
      {
        op: 'isapprox',
        field: 'date',
        value: {
          start: '2026-03-01',
          frequency: 'monthly',
          patterns: [],
          skipWeekend: false,
          weekendSolveMode: 'after',
          endMode: 'never',
          endOccurrences: 1,
          endDate: '2026-03-01',
        },
      },
    ];
    await expect(
      createSchedule({ conditions: conditions as never }),
    ).rejects.toThrow('multicurrency-schedule-unavailable');
    await expect(
      insertRule({
        stage: null,
        conditionsOp: 'and',
        conditions: conditions.slice(0, 2),
        actions: [{ op: 'link-schedule', value: 'sched' }],
      } as never),
    ).rejects.toThrow('multicurrency-schedule-unavailable');
  });
});

describe('foreign workflows awaiting later stages', () => {
  const pair = { amount: -1000, transaction_amount: -1500 };

  it('rejects creating or restructuring foreign split families', async () => {
    await expect(
      db.insertTransaction({
        id: 'p',
        account: 'jpy',
        date: '2026-03-01',
        ...pair,
        is_parent: true,
      }),
    ).rejects.toThrow('foreign-split-unavailable');
    await expect(
      batchUpdateTransactions({
        added: [
          {
            id: 'p',
            account: 'jpy',
            date: '2026-03-01',
            ...pair,
            is_parent: true,
          },
          {
            id: 'c',
            account: 'jpy',
            date: '2026-03-01',
            ...pair,
            is_child: true,
            parent_id: 'p',
          },
        ],
      }),
    ).rejects.toThrow('foreign-split-unavailable');
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      ...pair,
    });
    await expect(
      db.updateTransaction({ id: 'f', is_parent: true }),
    ).rejects.toThrow('foreign-split-unavailable');
    expect(
      db.runQuery(
        "SELECT id FROM transactions WHERE id IN ('p', 'c')",
        [],
        true,
      ),
    ).toEqual([]);
  });

  it('keeps metadata edits of an existing foreign family', async () => {
    db.runQuery(
      `INSERT INTO transactions
         (id, acct, date, amount, transaction_amount, amount_pair,
          isParent, isChild, parent_id, tombstone, sort_order)
         VALUES ('p', 'jpy', 20260301, -1000, -1500, '-1000:-1500', 1, 0, NULL, 0, 0)`,
    );
    await db.updateTransaction({ id: 'p', notes: 'synced', is_parent: true });
    expect(
      db.firstSync("SELECT notes FROM transactions WHERE id = 'p'"),
    ).toEqual({
      notes: 'synced',
    });
  });

  it('rejects linking foreign transactions to schedules', async () => {
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-01',
      ...pair,
    });
    await expect(
      db.updateTransaction({ id: 'f', schedule: 'sched' }),
    ).rejects.toThrow('multicurrency-schedule-unavailable');
    await expect(
      db.insertTransaction({
        id: 'g',
        account: 'jpy',
        date: '2026-03-01',
        ...pair,
        schedule: 'sched',
      }),
    ).rejects.toThrow('multicurrency-schedule-unavailable');
    await db.updateTransaction({ id: 'f', schedule: null });
  });
});

describe('deleting within foreign split families', () => {
  it('rejects deleting part of a family and allows deleting all of it', async () => {
    for (const [id, parent, child, parentId] of [
      ['p', 1, 0, null],
      ['c1', 0, 1, 'p'],
      ['c2', 0, 1, 'p'],
    ] as const) {
      db.runQuery(
        `INSERT INTO transactions
           (id, acct, date, amount, transaction_amount, amount_pair,
            isParent, isChild, parent_id, tombstone, sort_order)
           VALUES (?, 'jpy', 20260301, -500, -750, '-500:-750', ?, ?, ?, 0, 0)`,
        [id, parent, child, parentId],
      );
    }
    await expect(
      batchUpdateTransactions({ deleted: [{ id: 'c1' }] }),
    ).rejects.toThrow('foreign-split-unavailable');
    await batchUpdateTransactions({ deleted: [{ id: 'p' }] });
    expect(
      db.runQuery(
        "SELECT id FROM transactions WHERE tombstone = 0 AND id IN ('p', 'c1', 'c2')",
        [],
        true,
      ),
    ).toEqual([]);
  });
});

describe('tombstoning within foreign split families', () => {
  it('rejects tombstoning one child through an update', async () => {
    for (const [id, parent, child, parentId] of [
      ['p', 1, 0, null],
      ['c1', 0, 1, 'p'],
      ['c2', 0, 1, 'p'],
    ] as const) {
      db.runQuery(
        `INSERT INTO transactions
           (id, acct, date, amount, transaction_amount, amount_pair,
            isParent, isChild, parent_id, tombstone, sort_order)
           VALUES (?, 'jpy', 20260301, -500, -750, '-500:-750', ?, ?, ?, 0, 0)`,
        [id, parent, child, parentId],
      );
    }
    await expect(
      batchUpdateTransactions({ updated: [{ id: 'c1', tombstone: true }] }),
    ).rejects.toThrow('foreign-split-unavailable');
  });
});

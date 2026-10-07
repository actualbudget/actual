import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { clearUndo, undo } from '#server/undo';

import { app } from './app';
import { loadRules } from './transaction-rules';

import { batchUpdateTransactions } from '.';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const saveSplit = app.handlers['transactions/save-foreign-split'];
const collapse = app.handlers['transactions/collapse-foreign-split'];
const editTransfer = app.handlers['transactions/update-foreign-transfer'];
const postEntry = app.handlers['transactions/post-foreign-entry'];
const date = '2026-03-10';

type Row = {
  id: string;
  acct: string;
  amount: number;
  transaction_amount: number | null;
  isParent: number;
  isChild: number;
  parent_id: string | null;
  category: string | null;
  cleared: number;
  reconciled: number;
  date: number;
};

function rows(where = '1 = 1', params: string[] = []): Row[] {
  return db.runQuery<Row>(
    `SELECT id, acct, amount, transaction_amount, isParent, isChild,
       parent_id, category, cleared, reconciled, date
       FROM transactions WHERE tombstone = 0 AND ${where}
       ORDER BY isParent DESC, id`,
    params,
    true,
  );
}

const row = (id: string) => rows('id = ?', [id])[0];
const children = (parent: string) => rows('parent_id = ?', [parent]);

/** The transaction and its children as an editor reads them, by id. */
function familyOf(id: string) {
  return Object.fromEntries(
    [row(id), ...children(id)].map(r => [r.id, expectedOf(r.id)]),
  );
}

function expectedOf(id: string) {
  const stored = row(id);
  return {
    account: stored.acct,
    amount: stored.amount,
    transaction_amount: stored.transaction_amount,
    date: db.fromDateRepr(stored.date),
  };
}

async function foreignRow(
  id: string,
  account: string,
  amount: number,
  native: number,
  extra: Record<string, unknown> = {},
) {
  await db.insertTransaction({
    id,
    account,
    date,
    amount,
    transaction_amount: native,
    ...extra,
  });
}

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
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategory({ id: 'food', name: 'Food', cat_group: 'group' });
  await db.insertCategory({ id: 'fun', name: 'Fun', cat_group: 'group' });
});

describe('foreign split families', () => {
  it('splits a transaction, sharing its base in proportion', async () => {
    await foreignRow('t', 'jpy', -1000, -1500, { cleared: true });
    const result = await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -1500,
      children: [
        { transaction_amount: -1000, category: 'food' },
        { transaction_amount: -500, category: 'fun' },
      ],
    });
    expect(result).toMatchObject({ status: 'ok' });
    expect(row('t')).toMatchObject({
      isParent: 1,
      amount: -1000,
      transaction_amount: -1500,
      category: null,
    });
    const split = children('t');
    const byNative = [...split].sort(
      (a, b) => (a.transaction_amount ?? 0) - (b.transaction_amount ?? 0),
    );
    expect(byNative.map(child => child.transaction_amount)).toEqual([
      -1000, -500,
    ]);
    expect(split.reduce((sum, child) => sum + child.amount, 0)).toBe(-1000);
    expect(
      byNative.map(child => [child.transaction_amount, child.amount]),
    ).toEqual([
      [-1000, -667],
      [-500, -333],
    ]);
    // New children inherit the parent's cleared state.
    expect(split.every(child => child.cleared === 1)).toBe(true);
  });

  it('edits, adds and deletes children at 3dp, recomputing a changed total', async () => {
    await exchangeRatesApp.handlers['exchange-rates/save']({
      quoteCurrency: 'KWD',
      rate: '0.3',
      kind: 'standing',
      date: '2016-01-01',
    });
    await foreignRow('t', 'kwd', -1000, -3000);
    const first = await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -3000,
      children: [{ transaction_amount: -1000 }, { transaction_amount: -2000 }],
    });
    if (first.status !== 'ok') throw new Error('split failed');
    const [keep] = first.ids;
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -3300,
      children: [
        { id: keep, transaction_amount: -1100 },
        { transaction_amount: -2200 },
      ],
    });
    expect(row('t')).toMatchObject({
      amount: -1100,
      transaction_amount: -3300,
    });
    const split = children('t');
    expect(split).toHaveLength(2);
    expect(split.reduce((sum, child) => sum + child.amount, 0)).toBe(-1100);
    expect(split.find(child => child.id === keep)).toMatchObject({
      transaction_amount: -1100,
      amount: -367,
    });
  });

  it('values zero-total children at the rate, still summing to the parent', async () => {
    await exchangeRatesApp.handlers['exchange-rates/save']({
      quoteCurrency: 'JPY',
      rate: '3',
      kind: 'standing',
      date: '2016-01-01',
    });
    await foreignRow('t', 'jpy', 0, 0);
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: 0,
      children: [
        { id: 'a', transaction_amount: 150 },
        { id: 'b', transaction_amount: -100 },
        { id: 'c', transaction_amount: -50 },
      ].map(({ id: _id, ...child }) => child),
    });
    const split = children('t');
    expect(split.reduce((sum, child) => sum + child.amount, 0)).toBe(0);
    expect(split.map(child => child.amount).sort((a, b) => a - b)).toEqual(
      expect.arrayContaining([5000]),
    );
  });

  it('shares a confirmed base of a zero-total transaction', async () => {
    await foreignRow('t', 'jpy', 100, 0);
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: 0,
      children: [{ transaction_amount: 100 }, { transaction_amount: -100 }],
      rate: '100',
    });
    const split = children('t');
    expect(split.reduce((sum, child) => sum + child.amount, 0)).toBe(100);
    expect(split.map(child => child.amount).sort((a, b) => a - b)).toEqual([
      -50, 150,
    ]);
  });

  it('rejects children redistributed since the editor read them', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    const first = await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -1500,
      children: [{ transaction_amount: -700 }, { transaction_amount: -800 }],
    });
    if (first.status !== 'ok') throw new Error('split failed');
    const seen = familyOf('t');
    await saveSplit({
      id: 't',
      expected: seen,
      transaction_amount: -1500,
      children: [
        { id: first.ids[0], transaction_amount: -1000 },
        { id: first.ids[1], transaction_amount: -500 },
      ],
    });
    expect(
      await saveSplit({
        id: 't',
        expected: seen,
        transaction_amount: -1500,
        children: [{ id: first.ids[0], transaction_amount: -1500 }],
      }),
    ).toEqual({ status: 'stale' });
    expect(await collapse({ id: 't', expected: seen })).toEqual({
      status: 'stale',
    });
    expect(children('t')).toHaveLength(2);
  });

  it('checks the native balance exactly', async () => {
    await foreignRow('t', 'jpy', 1, 1);
    await expect(
      saveSplit({
        id: 't',
        expected: familyOf('t'),
        transaction_amount: 1,
        children: [
          { transaction_amount: Number.MAX_SAFE_INTEGER },
          { transaction_amount: 2 },
          { transaction_amount: -Number.MAX_SAFE_INTEGER },
        ],
      }),
    ).rejects.toThrow('foreign-split-unbalanced');
  });

  it('values children of a total changed to zero at the rate, saving no rate', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: 0,
      children: [{ transaction_amount: 300 }, { transaction_amount: -300 }],
      rate: '150',
    });
    expect(row('t')).toMatchObject({ amount: 0, transaction_amount: 0 });
    expect(
      children('t')
        .map(child => child.amount)
        .sort((a, b) => a - b),
    ).toEqual([-200, 200]);
    expect(
      db.firstSync('SELECT 1 FROM exchange_rates WHERE quote_currency = ?', [
        'JPY',
      ]),
    ).toBeNull();
  });

  it('collapses a split back into one transaction with its pair', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -1500,
      children: [{ transaction_amount: -700 }, { transaction_amount: -800 }],
    });
    await collapse({ id: 't', expected: familyOf('t') });
    expect(rows()).toEqual([
      expect.objectContaining({
        id: 't',
        isParent: 0,
        amount: -1000,
        transaction_amount: -1500,
      }),
    ]);
    await undo();
    expect(children('t')).toHaveLength(2);
  });

  it('recomputes a changed total by typed rate, saving it, or reports none', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    expect(
      await saveSplit({
        id: 't',
        expected: familyOf('t'),
        transaction_amount: -3000,
        children: [{ transaction_amount: -3000 }],
      }),
    ).toEqual({ status: 'rate-unavailable', date });
    expect(row('t')).toMatchObject({ isParent: 0, amount: -1000 });
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -3000,
      children: [{ transaction_amount: -1000 }, { transaction_amount: -2000 }],
      rate: '150',
    });
    expect(row('t')).toMatchObject({
      amount: -2000,
      transaction_amount: -3000,
    });
    // The typed rate is now the date's rate.
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -1500,
      children: [{ transaction_amount: -1500 }],
    });
    expect(row('t')).toMatchObject({ amount: -1000 });
  });

  it('rejects stale collapses and undoes a split', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -1500,
      children: [{ transaction_amount: -700 }, { transaction_amount: -800 }],
    });
    expect(
      await collapse({
        id: 't',
        expected: { ...familyOf('t'), t: { ...expectedOf('t'), amount: 1 } },
      }),
    ).toEqual({ status: 'stale' });
    await undo();
    expect(rows()).toEqual([
      expect.objectContaining({ id: 't', isParent: 0, amount: -1000 }),
    ]);
  });

  it('rejects unbalanced splits, transfer payees and stale views', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    await expect(
      saveSplit({
        id: 't',
        expected: familyOf('t'),
        transaction_amount: -1500,
        children: [{ transaction_amount: -1000 }],
      }),
    ).rejects.toThrow('foreign-split-unbalanced');
    await expect(
      saveSplit({
        id: 't',
        expected: familyOf('t'),
        transaction_amount: -1500,
        children: [
          {
            transaction_amount: -1500,
            payee: db.firstSync<{ id: string }>(
              "SELECT id FROM payees WHERE transfer_acct = 'jpy2'",
            )!.id,
          },
        ],
      }),
    ).rejects.toThrow('foreign-transfer-edit-unavailable');
    expect(
      await saveSplit({
        id: 't',
        expected: { t: { ...expectedOf('t'), amount: -1 } },
        transaction_amount: -1500,
        children: [{ transaction_amount: -1500 }],
      }),
    ).toEqual({ status: 'stale' });
    expect(row('t')).toMatchObject({ isParent: 0 });
  });

  it('clears child categories in an off-budget account', async () => {
    await foreignRow('t', 'jpyOff', -1000, -1500);
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -1500,
      children: [{ transaction_amount: -1500, category: 'food' }],
    });
    expect(children('t')[0].category).toBeNull();
  });

  it('keeps generic writes from restructuring foreign families', async () => {
    await foreignRow('t', 'jpy', -1000, -1500);
    await saveSplit({
      id: 't',
      expected: familyOf('t'),
      transaction_amount: -1500,
      children: [{ transaction_amount: -700 }, { transaction_amount: -800 }],
    });
    const [child] = children('t');
    await expect(
      batchUpdateTransactions({ deleted: [{ id: child.id }] }),
    ).rejects.toThrow('foreign-split-unavailable');
  });
});

describe('same-encoding transfers', () => {
  async function transfer() {
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
    return db.firstSync<{ transferred_id: string }>(
      "SELECT transferred_id FROM transactions WHERE id = 'leg'",
    )!.transferred_id;
  }

  it.each(['leg', 'counterpart'])(
    'edits both legs from the %s',
    async which => {
      const counterpart = await transfer();
      const id = which === 'leg' ? 'leg' : counterpart;
      const other = which === 'leg' ? counterpart : 'leg';
      const sign = row(id).transaction_amount! < 0 ? -1 : 1;
      await editTransfer({
        id,
        expected: { leg: expectedOf(id), counterpart: expectedOf(other) },
        transaction_amount: sign * 3000,
        baseAmount: sign * 2000,
        fields: { date: '2026-03-12' },
      });
      expect(row(id)).toMatchObject({
        amount: sign * 2000,
        transaction_amount: sign * 3000,
        date: 20260312,
      });
      expect(row(other)).toMatchObject({
        amount: -sign * 2000,
        transaction_amount: -sign * 3000,
        date: 20260312,
      });
    },
  );

  it('undoes a transfer edit on both legs', async () => {
    const counterpart = await transfer();
    const before = rows();
    await editTransfer({
      id: 'leg',
      expected: {
        leg: expectedOf('leg'),
        counterpart: expectedOf(counterpart),
      },
      transaction_amount: -3000,
      baseAmount: -2000,
    });
    await undo();
    expect(rows()).toEqual(before);
  });

  it('keeps categories off transfers between two on-budget accounts', async () => {
    const counterpart = await transfer();
    await editTransfer({
      id: 'leg',
      expected: {
        leg: expectedOf('leg'),
        counterpart: expectedOf(counterpart),
      },
      fields: { category: 'food' },
    });
    expect(row('leg').category).toBeNull();
  });

  it('rejects an impossible date', async () => {
    const counterpart = await transfer();
    await expect(
      editTransfer({
        id: 'leg',
        expected: {
          leg: expectedOf('leg'),
          counterpart: expectedOf(counterpart),
        },
        fields: { date: '2026-02-30' },
      }),
    ).rejects.toThrow('date-invalid');
  });

  it('rejects relinking and stale counterparts', async () => {
    const counterpart = await transfer();
    await expect(
      editTransfer({
        id: 'leg',
        expected: {
          leg: expectedOf('leg'),
          counterpart: expectedOf(counterpart),
        },
        fields: { payee: null },
      }),
    ).rejects.toThrow('foreign-transfer-edit-unavailable');
    expect(
      await editTransfer({
        id: 'leg',
        expected: {
          leg: expectedOf('leg'),
          counterpart: { ...expectedOf(counterpart), amount: 1 },
        },
        transaction_amount: -3000,
        baseAmount: -2000,
      }),
    ).toEqual({ status: 'stale' });
  });
});

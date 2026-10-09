import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { loadRules } from '#server/transactions/transaction-rules';
import { undo } from '#server/undo';
import { BASE_CURRENCY_LOCK } from '#server/util/currency';

import { app } from './app';
import {
  correctAccountCurrency,
  previewCurrencyCorrection,
} from './currency-correction';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const updateAccount = app.handlers['account-update'];

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

let order = 0;
/** Seeded directly: the correction only reads rows before it writes. */
function row(
  id: string,
  account: string,
  amount: number,
  native: number | null,
  fields: {
    date?: number;
    isParent?: boolean;
    parent?: string;
    tombstone?: boolean;
    reconciled?: boolean;
    category?: string;
  } = {},
) {
  db.runQuery(
    `INSERT INTO transactions (id, acct, date, amount, transaction_amount,
       isParent, isChild, parent_id, tombstone, reconciled, category,
       sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      account,
      fields.date ?? 20170110,
      amount,
      native,
      fields.isParent ? 1 : 0,
      fields.parent ? 1 : 0,
      fields.parent ?? null,
      fields.tombstone ? 1 : 0,
      fields.reconciled ? 1 : 0,
      fields.category ?? null,
      order++,
    ],
  );
  db.runQuery('UPDATE accounts SET currency_locked = 1 WHERE id = ?', [
    account,
  ]);
}

function stored(id: string) {
  return db.firstSync<{
    amount: number;
    transaction_amount: number | null;
    amount_pair: string | null;
  }>(
    'SELECT amount, transaction_amount, amount_pair FROM transactions WHERE id = ?',
    [id],
  );
}

function accountRow(id: string) {
  return db.firstSync<{
    currency: string | null;
    currency_precision: number | null;
    balance_current: number | null;
  }>(
    'SELECT currency, currency_precision, balance_current FROM accounts WHERE id = ?',
    [id],
  );
}

async function correct(
  account: string,
  currency: string | null,
  mode: 'convert' | 'keep',
  amounts?: Record<string, number>,
) {
  const preview = await previewCurrencyCorrection({
    account,
    currency,
    mode,
    amounts,
  });
  const result = await correctAccountCurrency({
    account,
    currency,
    mode,
    amounts,
    fingerprint: preview.fingerprint,
  });
  return { preview, result };
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
  for (const account of [
    { id: 'usd', name: 'Checking' },
    { id: 'jpy', name: 'Yen', currency: 'JPY', currency_precision: 0 },
    { id: 'kwd', name: 'Dinar', currency: 'KWD', currency_precision: 3 },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
});

describe('converting existing amounts', () => {
  it('moves a budget-currency account to yen keeping every base', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    row('b', 'usd', 2500, null, { tombstone: true });
    db.runQuery('UPDATE accounts SET balance_current = 1234 WHERE id = ?', [
      'usd',
    ]);
    const { preview, result } = await correct('usd', 'JPY', 'convert');
    expect(preview.effects).toEqual([]);
    expect(result).toEqual({ status: 'ok', changed: 2 });
    expect(accountRow('usd')).toEqual({
      currency: 'JPY',
      currency_precision: 0,
      balance_current: null,
    });
    expect(stored('a')).toMatchObject({
      amount: -1000,
      transaction_amount: -1500,
      amount_pair: '-1000:-1500@usd',
    });
    expect(stored('b')).toMatchObject({
      amount: 2500,
      transaction_amount: 3750,
    });
    // The first foreign account locks the budget currency.
    const lock = await db.first<{ value: string }>(
      'SELECT value FROM preferences WHERE id = ?',
      [BASE_CURRENCY_LOCK],
    );
    expect(lock?.value).toBe('USD');
  });

  it('returns a foreign account to the budget currency without changing bases', async () => {
    row('a', 'jpy', -1000, -1500);
    const { result } = await correct('jpy', null, 'convert');
    expect(result.status).toBe('ok');
    expect(accountRow('jpy')).toMatchObject({
      currency: null,
      currency_precision: null,
    });
    expect(stored('a')).toMatchObject({
      amount: -1000,
      transaction_amount: null,
    });
  });

  it('reports rounding loss exactly, even when the round trip hides it', async () => {
    await saveRate('JPY', '150.5');
    row('a', 'usd', 100, null);
    const { rows } = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    // 150.5 yen rounds half-even to 150; 150 yen converts back to $1.00.
    expect(rows[0]).toMatchObject({
      after: { amount: 100, transaction_amount: 150 },
      roundingLoss: true,
    });
  });

  it('keeps live family bases and corrects an obsolete child alone', async () => {
    await saveRate('KWD', '0.3');
    row('p', 'usd', -1000, null, { isParent: true });
    row('p1', 'usd', -400, null, { parent: 'p' });
    row('p2', 'usd', -600, null, { parent: 'p' });
    row('old', 'usd', -300, null, { parent: 'p', tombstone: true });
    const { result } = await correct('usd', 'KWD', 'convert');
    expect(result.status).toBe('ok');
    expect(stored('p')).toMatchObject({
      amount: -1000,
      transaction_amount: -3000,
    });
    expect(stored('p1')).toMatchObject({
      amount: -400,
      transaction_amount: -1200,
    });
    expect(stored('p2')).toMatchObject({
      amount: -600,
      transaction_amount: -1800,
    });
    expect(stored('old')).toMatchObject({
      amount: -300,
      transaction_amount: -900,
    });
  });

  it("values a mixed-date family at its parent's date", async () => {
    await saveRate('JPY', '100', '2016-01-01');
    await saveRate('JPY', '200', '2017-01-15');
    row('p', 'usd', 100, null, { isParent: true, date: 20170110 });
    row('p1', 'usd', 50, null, { parent: 'p', date: 20170110 });
    row('p2', 'usd', 50, null, { parent: 'p', date: 20170120 });
    const { rows } = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    expect(byId.p.after?.transaction_amount).toBe(100);
    expect(byId.p2).toMatchObject({
      rate: '100',
      dateDiffers: true,
      after: { transaction_amount: 50 },
    });
  });
});

describe('more targets and rows', () => {
  it('converts between foreign currencies keeping bases', async () => {
    await saveRate('KWD', '0.3');
    row('a', 'jpy', -900, -1500);
    const { result } = await correct('jpy', 'KWD', 'convert');
    expect(result.status).toBe('ok');
    expect(stored('a')).toMatchObject({
      amount: -900,
      transaction_amount: -2700,
    });
  });

  it("keeps a budget-currency account's numbers in a foreign currency", async () => {
    await saveRate('KWD', '0.3');
    row('a', 'usd', -1050, null);
    row('z', 'usd', 0, null);
    const { result } = await correct('usd', 'KWD', 'keep');
    expect(result.status).toBe('ok');
    // $10.50 becomes KWD 10.500, worth $35.00 at 0.3.
    expect(stored('a')).toMatchObject({
      amount: -3500,
      transaction_amount: -10500,
    });
    expect(stored('z')).toMatchObject({ amount: 0, transaction_amount: 0 });
  });

  it('corrects children of deleted parents as single rows', async () => {
    await saveRate('JPY', '150');
    row('gone', 'usd', -1000, null, { isParent: true, tombstone: true });
    row('orphan', 'usd', -400, null, { parent: 'gone' });
    const { result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
    expect(stored('orphan')).toMatchObject({
      amount: -400,
      transaction_amount: -600,
    });
    expect(stored('gone')).toMatchObject({
      amount: -1000,
      transaction_amount: -1500,
    });
  });

  it('counts reconciled rows and goes stale on category and row changes', async () => {
    await saveRate('JPY', '150');
    await db.insertCategoryGroup({ id: 'g', name: 'Group' });
    await db.insertCategory({ id: 'food', name: 'Food', cat_group: 'g' });
    await db.insertCategory({ id: 'rent', name: 'Rent', cat_group: 'g' });
    row('a', 'usd', -1000, null, { reconciled: true, category: 'food' });
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    expect(preview.reconciled).toBe(1);
    const apply = () =>
      correctAccountCurrency({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
        fingerprint: preview.fingerprint,
      });
    db.runQuery('UPDATE transactions SET category = ? WHERE id = ?', [
      'rent',
      'a',
    ]);
    expect(await apply()).toEqual({ status: 'stale' });
    db.runQuery('UPDATE transactions SET category = ? WHERE id = ?', [
      'food',
      'a',
    ]);
    row('b', 'usd', -10, null);
    expect(await apply()).toEqual({ status: 'stale' });
  });

  it('corrects a few thousand rows in one batch', async () => {
    await saveRate('JPY', '150');
    for (let i = 0; i < 2000; i++) {
      row(`r${String(i).padStart(4, '0')}`, 'usd', -(i + 1), null);
    }
    const { result } = await correct('usd', 'JPY', 'convert');
    expect(result).toEqual({ status: 'ok', changed: 2000 });
    expect(stored('r1999')).toMatchObject({
      amount: -2000,
      transaction_amount: -3000,
    });
  });
});

describe('keeping the numbers', () => {
  it('rescales magnitudes and recomputes bases', async () => {
    await saveRate('KWD', '0.3');
    row('a', 'jpy', -900, -1500);
    const { preview, result } = await correct('jpy', 'KWD', 'keep');
    expect(preview.rows[0].roundingLoss).toBe(false);
    expect(result.status).toBe('ok');
    // ¥1,500 becomes KWD 1,500.000, worth $5,000.00 at 0.3.
    expect(stored('a')).toMatchObject({
      amount: -500000,
      transaction_amount: -1500000,
    });
  });

  it('rounds to a coarser precision and reports the loss', async () => {
    await saveRate('JPY', '150');
    row('a', 'kwd', -1033, -3100);
    const { preview } = await correct('kwd', 'JPY', 'keep');
    expect(preview.rows[0]).toMatchObject({
      after: { transaction_amount: -3, amount: -2 },
      roundingLoss: true,
    });
  });

  it('allocates a family by the remainder rule', async () => {
    await saveRate('JPY', '100');
    row('p', 'kwd', -1000, 1000, { isParent: true });
    row('c1', 'kwd', -500, 500, { parent: 'p' });
    row('c2', 'kwd', -500, 500, { parent: 'p' });
    const { result } = await correct('kwd', 'JPY', 'keep');
    expect(result.status).toBe('ok');
    // KWD 1.000 is exactly ¥1; the halves tie and the lower id takes it.
    expect(stored('p')?.transaction_amount).toBe(1);
    expect(stored('c1')?.transaction_amount).toBe(1);
    expect(stored('c2')?.transaction_amount).toBe(0);
    expect(stored('c1')!.amount + stored('c2')!.amount).toBe(
      stored('p')!.amount,
    );
  });

  it('values a zero-total family at the family rate', async () => {
    await saveRate('EUR', '0.5');
    row('p', 'kwd', 0, 0, { isParent: true });
    row('c1', 'kwd', 300, 1000, { parent: 'p' });
    row('c2', 'kwd', -300, -1000, { parent: 'p' });
    const { result } = await correct('kwd', 'EUR', 'keep');
    expect(result.status).toBe('ok');
    // KWD ±1.000 becomes EUR ±1.00, worth ±$2.00 at 0.5.
    expect(stored('c1')).toMatchObject({
      transaction_amount: 100,
      amount: 200,
    });
    expect(stored('c2')).toMatchObject({
      transaction_amount: -100,
      amount: -200,
    });
    expect(stored('p')).toMatchObject({ transaction_amount: 0, amount: 0 });
  });

  it('reports budget effects for budgeted months', async () => {
    await saveRate('KWD', '0.3');
    await db.insertCategoryGroup({ id: 'g', name: 'Group' });
    await db.insertCategory({ id: 'food', name: 'Food', cat_group: 'g' });
    db.runQuery(
      `INSERT INTO zero_budgets (id, month, category, amount)
         VALUES ('201701-food', 201701, 'food', 5000)`,
    );
    row('a', 'jpy', -900, -1500, { category: 'food' });
    const { effects } = await previewCurrencyCorrection({
      account: 'jpy',
      currency: 'KWD',
      mode: 'keep',
    });
    expect(effects).toEqual([
      {
        month: '2017-01',
        effects: [
          {
            category: 'food',
            name: 'Food',
            kind: 'spending',
            amount: -500000 + 900,
          },
        ],
      },
    ]);
  });
});

describe('missing rates', () => {
  it('lists missing dates and needs explicit amounts', async () => {
    row('a', 'usd', -1000, null, { date: 20170110 });
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    expect(preview.missingRates).toEqual(['2017-01-10']);
    expect(preview.rows[0].after).toBeNull();
    expect(
      await correctAccountCurrency({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
        fingerprint: preview.fingerprint,
      }),
    ).toEqual({ status: 'rates-missing', dates: ['2017-01-10'] });
    expect(accountRow('usd')?.currency).toBeNull();

    const { preview: completed, result } = await correct(
      'usd',
      'JPY',
      'convert',
      {
        a: -1600,
      },
    );
    expect(completed.rows[0].after).toEqual({
      amount: -1000,
      transaction_amount: -1600,
    });
    expect(result.status).toBe('ok');
    expect(stored('a')?.transaction_amount).toBe(-1600);
  });

  it('completes a zero-total family only with every child value', async () => {
    row('p', 'kwd', 0, 0, { isParent: true });
    row('c1', 'kwd', 300, 1000, { parent: 'p' });
    row('c2', 'kwd', -300, -1000, { parent: 'p' });
    const parentOnly = await previewCurrencyCorrection({
      account: 'kwd',
      currency: 'EUR',
      mode: 'keep',
      amounts: { p: 0 },
    });
    expect(parentOnly.missingRates).toEqual(['2017-01-10']);
    await expect(
      previewCurrencyCorrection({
        account: 'kwd',
        currency: 'EUR',
        mode: 'keep',
        amounts: { p: 5, c1: 250, c2: -250 },
      }),
    ).rejects.toThrow('correction-amounts-mismatch');
    const { result } = await correct('kwd', 'EUR', 'keep', {
      c1: 250,
      c2: -250,
    });
    expect(result.status).toBe('ok');
    expect(stored('c1')).toMatchObject({
      amount: 250,
      transaction_amount: 100,
    });
  });
});

describe('stale and rejected corrections', () => {
  it('rejects a fingerprint after changes or with other parameters', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    const apply = (overrides = {}) =>
      correctAccountCurrency({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
        fingerprint: preview.fingerprint,
        ...overrides,
      });
    expect(await apply({ mode: 'keep' })).toEqual({ status: 'stale' });
    expect(await apply({ amounts: { a: 1 } })).toEqual({ status: 'stale' });

    db.runQuery('UPDATE transactions SET reconciled = 1 WHERE id = ?', ['a']);
    expect(await apply()).toEqual({ status: 'stale' });
    db.runQuery('UPDATE transactions SET reconciled = 0 WHERE id = ?', ['a']);

    await saveRate('JPY', '151', '2017-01-01');
    expect(await apply()).toEqual({ status: 'stale' });
    expect(accountRow('usd')?.currency).toBeNull();
    expect(stored('a')?.transaction_amount).toBeNull();
  });

  it('rejects out-of-range values and writes nothing', async () => {
    row('a', 'jpy', -1000, 9_100_000_000_000);
    const preview = await previewCurrencyCorrection({
      account: 'jpy',
      currency: 'KWD',
      mode: 'keep',
    });
    expect(preview.rows[0].error).toBe('amount-out-of-range');
    await expect(
      correctAccountCurrency({
        account: 'jpy',
        currency: 'KWD',
        mode: 'keep',
        fingerprint: preview.fingerprint,
      }),
    ).rejects.toThrow('amount-out-of-range');
    expect(accountRow('jpy')?.currency).toBe('JPY');
  });

  it('rejects transfer payees without links and keeps generic currency edits immutable', async () => {
    const payee = await db.first<{ id: string }>(
      'SELECT id FROM payees WHERE transfer_acct = ?',
      ['usd'],
    );
    row('a', 'usd', -1000, null);
    db.runQuery('UPDATE transactions SET description = ? WHERE id = ?', [
      payee!.id,
      'a',
    ]);
    row('b', 'kwd', 1000, 3000);
    db.runQuery('UPDATE transactions SET description = ? WHERE id = ?', [
      payee!.id,
      'b',
    ]);
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('correction-transfer-broken');
    row('y', 'jpy', -1000, -1500);
    await updateAccount({
      id: 'jpy',
      name: 'Yen',
      currency: 'KWD',
    } as never).catch(() => undefined);
    expect(accountRow('jpy')?.currency).toBe('JPY');
  });

  it('rejects an unchanged or unreviewed target', async () => {
    await expect(
      previewCurrencyCorrection({
        account: 'jpy',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('account-currency-unchanged');
    await expect(
      previewCurrencyCorrection({
        account: 'jpy',
        currency: 'XXX',
        mode: 'convert',
      }),
    ).rejects.toThrow('account-currency-invalid');
  });

  it('clears undo history', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    await correct('usd', 'JPY', 'convert');
    await undo();
    expect(accountRow('usd')?.currency).toBe('JPY');
  });
});

describe('inspection round 1 cases', () => {
  it('converts the parent itself and rejects inconsistent families', async () => {
    await saveRate('JPY', '150');
    row('p', 'usd', 100, null, { isParent: true });
    row('c1', 'usd', 60, null, { parent: 'p' });
    row('c2', 'usd', 50, null, { parent: 'p' });
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    expect(
      preview.rows.every(r => r.error === 'split-family-inconsistent'),
    ).toBe(true);
    await expect(
      correctAccountCurrency({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
        fingerprint: preview.fingerprint,
      }),
    ).rejects.toThrow('split-family-inconsistent');
  });

  it('treats a parent without live children as a plain row', async () => {
    await saveRate('JPY', '150');
    row('p', 'usd', 100, null, { isParent: true });
    const { rows } = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    expect(rows[0].after).toEqual({ amount: 100, transaction_amount: 150 });
  });

  it('sums families exactly beyond floating point', async () => {
    await saveRate('JPY', '100');
    row('p', 'usd', 2, null, { isParent: true });
    row('a', 'usd', 9007199254740991, null, { parent: 'p' });
    row('b', 'usd', 2, null, { parent: 'p' });
    row('c', 'usd', -9007199254740991, null, { parent: 'p' });
    const { rows } = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    expect(byId.p.error).toBeUndefined();
    expect(byId.p.after?.transaction_amount).toBe(2);
  });

  it('keeps a zero-total parent at zero when children are completed', async () => {
    row('p', 'usd', 0, null, { isParent: true });
    row('c1', 'usd', 100, null, { parent: 'p' });
    row('c2', 'usd', -100, null, { parent: 'p' });
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
        amounts: { c1: 200, c2: -100 },
      }),
    ).rejects.toThrow('correction-amounts-mismatch');
    const { rows } = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
      amounts: { c1: 150, c2: -150 },
    });
    expect(rows.find(r => r.id === 'p')?.after).toEqual({
      amount: 0,
      transaction_amount: 0,
    });
  });

  it('marks range failures from allocators and explicit values as row errors', async () => {
    row('p', 'jpy', -1000, 9_100_000_000_000, { isParent: true });
    row('c1', 'jpy', -500, 4_550_000_000_000, { parent: 'p' });
    row('c2', 'jpy', -500, 4_550_000_000_000, { parent: 'p' });
    const keep = await previewCurrencyCorrection({
      account: 'jpy',
      currency: 'KWD',
      mode: 'keep',
    });
    expect(keep.rows.every(r => r.error === 'amount-out-of-range')).toBe(true);

    row('s', 'usd', -1000, null);
    const explicitPreview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
      amounts: { s: Number.MAX_SAFE_INTEGER + 1 },
    });
    expect(explicitPreview.rows[0].error).toBe('amount-out-of-range');
    expect(explicitPreview.missingRates).toEqual([]);
  });

  it('flags rounding loss per row', async () => {
    await saveRate('EUR', '2');
    row('p', 'kwd', 0, 20, { isParent: true });
    row('c1', 'kwd', 0, 10, { parent: 'p' });
    row('c2', 'kwd', 0, 10, { parent: 'p' });
    const { rows } = await previewCurrencyCorrection({
      account: 'kwd',
      currency: 'EUR',
      mode: 'keep',
    });
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    // EUR 0.02 is exactly 1 cent at 2; each child's half cent is not.
    expect(byId.p.roundingLoss).toBe(false);
    expect(byId.c1.roundingLoss).toBe(true);
    expect(byId.c2.roundingLoss).toBe(true);

    await saveRate('JPY', '150');
    row('q', 'usd', 2, null, { isParent: true });
    row('q1', 'usd', 1, null, { parent: 'q' });
    row('q2', 'usd', 1, null, { parent: 'q' });
    const convert = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    const q = Object.fromEntries(convert.rows.map(r => [r.id, r]));
    // $0.02 is exactly ¥3; each cent is ¥1.5.
    expect(q.q.roundingLoss).toBe(false);
    expect(q.q1.roundingLoss).toBe(true);
  });

  it('unlinks own rows from other-encoding schedules and rejects unlinked transfer payees', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    db.runQuery('UPDATE transactions SET schedule = ? WHERE id = ?', [
      'sched',
      'a',
    ]);
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    expect(preview.rows[0].scheduleUnlinked).toBe(true);
    const kwdPayee = await db.first<{ id: string }>(
      'SELECT id FROM payees WHERE transfer_acct = ?',
      ['kwd'],
    );
    db.runQuery('UPDATE transactions SET description = ? WHERE id = ?', [
      kwdPayee!.id,
      'a',
    ]);
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('correction-transfer-broken');
  });

  it("reports a family's valuation date once as missing", async () => {
    await saveRate('JPY', '150', '2017-01-20');
    row('p', 'usd', 100, null, { isParent: true, date: 20170110 });
    row('c1', 'usd', 50, null, { parent: 'p', date: 20170110 });
    row('c2', 'usd', 50, null, { parent: 'p', date: 20170120 });
    const { missingRates } = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    expect(missingRates).toEqual(['2017-01-10']);
  });

  it('returns stale when the preview predates a completed correction', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const { preview, result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
    expect(
      await correctAccountCurrency({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
        fingerprint: preview.fingerprint,
      }),
    ).toEqual({ status: 'stale' });
  });

  it('keeps a missing date when another row on it has an error', async () => {
    row('big', 'jpy', -1000, 9_100_000_000_000, { date: 20170110 });
    row('small', 'jpy', -900, -1500, { date: 20170110 });
    row('p', 'jpy', -900, -1500, { isParent: true, date: 20170110 });
    row('c1', 'jpy', -900, -1500, { parent: 'p', date: 20170120 });
    const preview = await previewCurrencyCorrection({
      account: 'jpy',
      currency: 'KWD',
      mode: 'keep',
    });
    const byId = Object.fromEntries(preview.rows.map(r => [r.id, r]));
    expect(byId.big.error).toBe('amount-out-of-range');
    expect(byId.small.after).toBeNull();
    expect(preview.missingRates).toEqual(['2017-01-10']);
  });
});

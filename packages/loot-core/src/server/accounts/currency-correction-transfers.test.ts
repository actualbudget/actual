import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { createSchedule } from '#server/schedules/app';
import { loadRules } from '#server/transactions/transaction-rules';

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

const payeeOf = (account: string) =>
  db.firstSync<{ id: string }>(
    'SELECT id FROM payees WHERE transfer_acct = ?',
    [account],
  )!.id;

let order = 0;
/** Seeded directly: the correction only reads rows before it writes. */
function row(
  id: string,
  account: string,
  amount: number,
  native: number | null,
  fields: {
    isParent?: boolean;
    parent?: string;
    transfer?: { id: string; account: string };
    schedule?: string;
    reconciled?: boolean;
  } = {},
) {
  db.runQuery(
    `INSERT INTO transactions (id, acct, date, amount, transaction_amount,
       isParent, isChild, parent_id, transferred_id, description, schedule,
       tombstone, reconciled, sort_order)
     VALUES (?, ?, 20170110, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      account,
      amount,
      native,
      fields.isParent ? 1 : 0,
      fields.parent ? 1 : 0,
      fields.parent ?? null,
      fields.transfer?.id ?? null,
      fields.transfer ? payeeOf(fields.transfer.account) : null,
      fields.schedule ?? null,
      fields.reconciled ? 1 : 0,
      order++,
    ],
  );
  db.runQuery('UPDATE accounts SET currency_locked = 1 WHERE id = ?', [
    account,
  ]);
}

/** Both legs of a transfer, each pointing at the other. */
function transfer(
  a: { id: string; account: string; amount: number; native: number | null },
  b: { id: string; account: string; amount: number; native: number | null },
  options: { aParent?: string; bParent?: string } = {},
) {
  row(a.id, a.account, a.amount, a.native, {
    transfer: { id: b.id, account: b.account },
    parent: options.aParent,
  });
  row(b.id, b.account, b.amount, b.native, {
    transfer: { id: a.id, account: a.account },
    parent: options.bParent,
  });
}

const stored = (id: string) =>
  db.firstSync<{
    amount: number;
    transaction_amount: number | null;
    schedule: string | null;
  }>(
    'SELECT amount, transaction_amount, schedule FROM transactions WHERE id = ?',
    [id],
  );

async function correct(
  account: string,
  currency: string | null,
  mode: 'convert' | 'keep',
  extra: Partial<Parameters<typeof previewCurrencyCorrection>[0]> = {},
) {
  const preview = await previewCurrencyCorrection({
    account,
    currency,
    mode,
    ...extra,
  });
  const result = await correctAccountCurrency({
    account,
    currency,
    mode,
    ...extra,
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
    { id: 'usd2', name: 'Savings' },
    { id: 'jpy', name: 'Yen', currency: 'JPY', currency_precision: 0 },
    { id: 'jpy2', name: 'Yen 2', currency: 'JPY', currency_precision: 0 },
    { id: 'kwd', name: 'Dinar', currency: 'KWD', currency_precision: 3 },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
});

describe('transfers in Convert mode', () => {
  it('keeps bases and leaves a budget-currency counterpart untouched', async () => {
    await saveRate('JPY', '150');
    transfer(
      { id: 'a', account: 'usd', amount: -1000, native: null },
      { id: 'b', account: 'usd2', amount: 1000, native: null },
    );
    const { preview, result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
    expect(preview.rows.find(r => r.id === 'a')?.counterpart).toEqual({
      account: 'usd2',
      id: 'b',
      before: { amount: 1000, transaction_amount: null },
      after: { amount: 1000, transaction_amount: null },
    });
    expect(stored('a')).toMatchObject({
      amount: -1000,
      transaction_amount: -1500,
    });
    expect(stored('b')).toMatchObject({
      amount: 1000,
      transaction_amount: null,
    });
  });

  it('turns a same-encoding transfer into an exchange', async () => {
    await saveRate('KWD', '0.3');
    transfer(
      { id: 'a', account: 'jpy', amount: -900, native: -1500 },
      { id: 'b', account: 'jpy2', amount: 900, native: 1500 },
    );
    const { result } = await correct('jpy', 'KWD', 'convert');
    expect(result.status).toBe('ok');
    expect(stored('a')).toMatchObject({
      amount: -900,
      transaction_amount: -2700,
    });
    expect(stored('b')).toMatchObject({
      amount: 900,
      transaction_amount: 1500,
    });
  });

  it('matches a leg to its counterpart when the transfer becomes same-encoding', async () => {
    await saveRate('JPY', '150');
    transfer(
      { id: 'a', account: 'kwd', amount: -1033, native: -3100 },
      { id: 'b', account: 'jpy', amount: 1033, native: 1600 },
    );
    const { preview, result } = await correct('kwd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
    expect(preview.rows.find(r => r.id === 'a')).toMatchObject({
      matchedToCounterpart: true,
      roundingLoss: true,
    });
    expect(stored('a')).toMatchObject({
      amount: -1033,
      transaction_amount: -1600,
    });
  });

  it('matches a leg to its counterpart without a rate', async () => {
    transfer(
      { id: 'a', account: 'kwd', amount: -1033, native: -3100 },
      { id: 'b', account: 'jpy', amount: 1033, native: 1600 },
    );
    const { preview, result } = await correct('kwd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
    expect(preview.missingRates).toEqual([]);
    expect(preview.rows.find(r => r.id === 'a')).toMatchObject({
      matchedToCounterpart: true,
    });
    expect(stored('a')).toMatchObject({
      amount: -1033,
      transaction_amount: -1600,
    });
  });

  it('clears natives when a transfer becomes a budget-currency transfer', async () => {
    transfer(
      { id: 'a', account: 'jpy', amount: -900, native: -1500 },
      { id: 'b', account: 'usd', amount: 900, native: null },
    );
    const { result } = await correct('jpy', null, 'convert');
    expect(result.status).toBe('ok');
    expect(stored('a')).toMatchObject({
      amount: -900,
      transaction_amount: null,
    });
    expect(stored('b')).toMatchObject({ amount: 900 });
  });
});

describe('transfers in Keep mode', () => {
  it('keeps the magnitude and edits a budget-currency counterpart', async () => {
    transfer(
      { id: 'a', account: 'jpy', amount: -900, native: -1500 },
      { id: 'b', account: 'usd', amount: 900, native: null },
    );
    const { preview, result } = await correct('jpy', null, 'keep');
    expect(result.status).toBe('ok');
    // ¥1,500 becomes $1,500.00; the counterpart follows.
    expect(stored('a')).toMatchObject({
      amount: -150000,
      transaction_amount: null,
    });
    expect(stored('b')).toMatchObject({ amount: 150000 });
    expect(preview.rows.find(r => r.id === 'b')).toMatchObject({
      external: true,
      account: 'usd',
    });
  });

  it("edits a foreign counterpart's base and keeps its native", async () => {
    await saveRate('EUR', '0.5');
    transfer(
      { id: 'a', account: 'jpy', amount: -900, native: -1500 },
      { id: 'b', account: 'kwd', amount: 900, native: 3100 },
    );
    const { result } = await correct('jpy', 'EUR', 'keep');
    expect(result.status).toBe('ok');
    // EUR 1,500.00 at 0.5 is $3,000.00.
    expect(stored('a')).toMatchObject({
      amount: -300000,
      transaction_amount: -150000,
    });
    expect(stored('b')).toMatchObject({
      amount: 300000,
      transaction_amount: 3100,
    });
  });

  it('shares one amount when the transfer becomes same-encoding', async () => {
    await saveRate('JPY', '150');
    transfer(
      { id: 'a', account: 'kwd', amount: -1033, native: -3100 },
      { id: 'b', account: 'jpy', amount: 1033, native: 1500 },
    );
    const { result } = await correct('kwd', 'JPY', 'keep');
    expect(result.status).toBe('ok');
    expect(stored('a')).toMatchObject({ amount: -2, transaction_amount: -3 });
    expect(stored('b')).toMatchObject({ amount: 2, transaction_amount: 3 });
  });

  it("revalues a fee-family counterpart's fee and parent", async () => {
    await saveRate('EUR', '0.5');
    row('bp', 'kwd', 800, 2900, { isParent: true });
    transfer(
      { id: 'a', account: 'jpy', amount: -900, native: -1500 },
      { id: 'b', account: 'kwd', amount: 900, native: 3100 },
      { bParent: 'bp' },
    );
    row('fee', 'kwd', -100, -200, { parent: 'bp' });
    const { result } = await correct('jpy', 'EUR', 'keep');
    expect(result.status).toBe('ok');
    expect(stored('b')).toMatchObject({ amount: 300000 });
    // The fee's base follows the transfer's (MC-4.1): 200 × 300000 / 3100.
    expect(stored('fee')).toMatchObject({
      amount: -19355,
      transaction_amount: -200,
    });
    expect(stored('bp')).toMatchObject({
      amount: 280645,
      transaction_amount: 2900,
    });
  });
});

describe('rejected transfer shapes', () => {
  it('rejects a fee family that would become same-encoding', async () => {
    row('bp', 'jpy', 900, 1400, { isParent: true });
    transfer(
      { id: 'a', account: 'kwd', amount: -1000, native: -3100 },
      { id: 'b', account: 'jpy', amount: 1000, native: 1500 },
      { bParent: 'bp' },
    );
    row('fee', 'jpy', -100, -100, { parent: 'bp' });
    await expect(
      previewCurrencyCorrection({
        account: 'kwd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('correction-exchange-fee-unsupported');
  });

  it('rejects an ordinary split transfer that would become an exchange', async () => {
    row('bp', 'usd2', 1000, null, { isParent: true });
    transfer(
      { id: 'a', account: 'usd', amount: -600, native: null },
      { id: 'b', account: 'usd2', amount: 600, native: null },
      { bParent: 'bp' },
    );
    row('c1', 'usd2', 300, null, { parent: 'bp' });
    row('c2', 'usd2', 100, null, { parent: 'bp' });
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('correction-split-transfer-unsupported');
  });

  it('rejects an exchange with fees at both endpoints', async () => {
    await saveRate('JPY', '150');
    row('ap', 'usd', -11000, null, { isParent: true });
    row('bp', 'usd2', 8000, null, { isParent: true });
    transfer(
      { id: 'a', account: 'usd', amount: -10000, native: null },
      { id: 'b', account: 'usd2', amount: 10000, native: null },
      { aParent: 'ap', bParent: 'bp' },
    );
    row('afee', 'usd', -1000, null, { parent: 'ap' });
    row('bfee', 'usd2', -2000, null, { parent: 'bp' });
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('correction-exchange-invalid');
  });

  it('rejects an exchange whose fee sibling is an inflow', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -10000, null, {
      transfer: { id: 'b', account: 'usd2' },
    });
    row('bp', 'usd2', 12000, null, { isParent: true });
    row('b', 'usd2', 10000, null, {
      transfer: { id: 'a', account: 'usd' },
      parent: 'bp',
    });
    row('bfee', 'usd2', 2000, null, { parent: 'bp' });
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('correction-exchange-invalid');
  });

  it('carries a zero transfer', async () => {
    await saveRate('JPY', '150');
    transfer(
      { id: 'a', account: 'usd', amount: 0, native: null },
      { id: 'b', account: 'usd2', amount: 0, native: null },
    );
    const { result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
  });

  it('keeps a large fee on a small principal in Convert', async () => {
    await saveRate('JPY', '150');
    row('ap', 'usd', -103, null, { isParent: true });
    transfer(
      { id: 'a', account: 'usd', amount: -3, native: null },
      { id: 'b', account: 'kwd', amount: 3, native: 10 },
      { aParent: 'ap' },
    );
    row('afee', 'usd', -100, null, { parent: 'ap' });
    const { result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
    // feeBase(134, 3, 4) = 100.5 rounds half-even to 100, the stored base.
    expect(stored('afee')).toMatchObject({
      amount: -100,
      transaction_amount: -134,
    });
    expect(stored('ap')).toMatchObject({
      amount: -103,
      transaction_amount: -138,
    });
  });

  it('keeps a fee outflow whose converted native rounds to zero', async () => {
    await saveRate('JPY', '49');
    // The fee sorts before the leg, so allocation gives it the zero.
    row('ap', 'usd', -2, null, { isParent: true });
    row('a0fee', 'usd', -1, null, { parent: 'ap' });
    transfer(
      { id: 'a1', account: 'usd', amount: -1, native: null },
      { id: 'b', account: 'kwd', amount: 1, native: 3 },
      { aParent: 'ap' },
    );
    const { result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
    expect(stored('a0fee')).toMatchObject({
      amount: -1,
      transaction_amount: -1,
    });
  });

  it('leaves a destination fee a positive net credit', async () => {
    await saveRate('KWD', '0.3');
    transfer(
      { id: 'a', account: 'usd', amount: -1, native: null },
      { id: 'b', account: 'jpy', amount: 1, native: 100 },
      { bParent: 'bp' },
    );
    row('bp', 'jpy', 0, 1, { isParent: true });
    row('bfee', 'jpy', -1, -99, { parent: 'bp' });
    const { result } = await correct('jpy', 'KWD', 'convert');
    expect(result.status).toBe('ok');
    // feeBase(2, 1, 3) rounds to the stored 1 and leaves a net of 1.
    expect(stored('bfee')).toMatchObject({
      amount: -1,
      transaction_amount: -2,
    });
  });

  it('rejects an explicit amount that reverses the valuation', async () => {
    transfer(
      { id: 'a', account: 'jpy', amount: -1000, native: -1500 },
      { id: 'b', account: 'kwd', amount: 1000, native: 3000 },
    );
    await expect(
      previewCurrencyCorrection({
        account: 'jpy',
        currency: 'EUR',
        mode: 'keep',
        amounts: { a: 1000 },
      }),
    ).rejects.toThrow('correction-exchange-invalid');
    const { result } = await correct('jpy', 'EUR', 'keep', {
      amounts: { a: -1000 },
    });
    expect(result.status).toBe('ok');
  });

  it('keeps a zero transfer at zero', async () => {
    transfer(
      { id: 'a', account: 'jpy', amount: 0, native: 0 },
      { id: 'b', account: 'jpy2', amount: 0, native: 0 },
    );
    for (const value of [1000, -1000]) {
      await expect(
        previewCurrencyCorrection({
          account: 'jpy',
          currency: 'EUR',
          mode: 'keep',
          amounts: { a: value },
        }),
      ).rejects.toThrow('correction-exchange-invalid');
    }
    const { result } = await correct('jpy', 'EUR', 'keep', {
      amounts: { a: 0 },
    });
    expect(result.status).toBe('ok');
  });

  it('goes stale when a counterpart changes after the preview', async () => {
    await saveRate('JPY', '150');
    transfer(
      { id: 'a', account: 'usd', amount: -1000, native: null },
      { id: 'b', account: 'usd2', amount: 1000, native: null },
    );
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    db.runQuery('UPDATE transactions SET reconciled = 1 WHERE id = ?', ['b']);
    expect(
      await correctAccountCurrency({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
        fingerprint: preview.fingerprint,
      }),
    ).toEqual({ status: 'stale' });
  });
});

describe('schedules', () => {
  const monthly = {
    start: '2017-01-10',
    frequency: 'monthly' as const,
    patterns: [],
    skipWeekend: false,
    weekendSolveMode: 'after' as const,
    endMode: 'never' as const,
  };
  type Rule = {
    field?: string;
    op?: string;
    value?: unknown;
    options?: Record<string, unknown>;
  };

  async function scheduleRule(scheduleId: string) {
    const rule = await db.first<{ conditions: string; actions: string }>(
      `SELECT r.conditions, r.actions FROM schedules s JOIN rules r
         ON r.id = s.rule WHERE s.id = ?`,
      [scheduleId],
    );
    return {
      conditions: JSON.parse(rule!.conditions) as Rule[],
      actions: JSON.parse(rule!.actions) as Rule[],
    };
  }

  it('re-encodes a schedule of the account in Keep mode', async () => {
    await saveRate('KWD', '0.3');
    row('a', 'jpy', -900, -1500);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'isapprox', field: 'date', value: monthly },
        {
          op: 'isbetween',
          field: 'amount',
          value: { num1: -1600, num2: -1400 },
        },
      ],
    });
    const { preview, result } = await correct('jpy', 'KWD', 'keep');
    expect(result.status).toBe('ok');
    expect(preview.schedules[0].id).toBe(id);
    const { conditions } = await scheduleRule(id);
    expect(conditions.find(c => c.field === 'amount')!.value).toEqual({
      num1: -1600000,
      num2: -1400000,
    });
  });

  it('converts a schedule amount and syncs a plain set amount action', async () => {
    await saveRate('JPY', '150');
    row('a', 'jpy', -900, -1500);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1500 },
      ],
    });
    const rule = await db.first<{ id: string; actions: string }>(
      'SELECT r.id, r.actions FROM schedules s JOIN rules r ON r.id = s.rule WHERE s.id = ?',
      [id],
    );
    db.runQuery('UPDATE rules SET actions = ? WHERE id = ?', [
      JSON.stringify([
        ...JSON.parse(rule!.actions),
        { op: 'set', field: 'amount', value: -1500 },
      ]),
      rule!.id,
    ]);
    const { result } = await correct('jpy', null, 'convert');
    expect(result.status).toBe('ok');
    const { conditions, actions } = await scheduleRule(id);
    // ¥1,500 at 150 is $10.00.
    expect(conditions.find(c => c.field === 'amount')!.value).toBe(-1000);
    expect(
      actions.find(a => a.op === 'set' && a.field === 'amount')!.value,
    ).toBe(-1000);
  });

  it('needs an explicit schedule amount without a rate', async () => {
    row('a', 'usd', -1000, null);
    await saveRate('JPY', '150', '2017-01-01');
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd' },
        {
          op: 'isapprox',
          field: 'date',
          value: { ...monthly, start: '2016-06-10' },
        },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    const { result } = await correct('usd', 'JPY', 'convert', {
      amounts: {},
      scheduleAmounts: { [id]: -1500 },
    });
    expect(result.status).toBe('ok');
  });

  it('rejects a schedule with a second amount predicate', async () => {
    await saveRate('JPY', '150');
    row('a', 'jpy', -900, -1500);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1500 },
      ],
    });
    const rule = await db.first<{ id: string; conditions: string }>(
      'SELECT r.id, r.conditions FROM schedules s JOIN rules r ON r.id = s.rule WHERE s.id = ?',
      [id],
    );
    db.runQuery('UPDATE rules SET conditions = ? WHERE id = ?', [
      JSON.stringify([
        ...JSON.parse(rule!.conditions),
        { op: 'lt', field: 'amount', value: -1400 },
      ]),
      rule!.id,
    ]);
    await expect(
      previewCurrencyCorrection({
        account: 'jpy',
        currency: null,
        mode: 'convert',
      }),
    ).rejects.toThrow('account-currency-has-schedules');
  });

  it('rejects fixed split amounts and oneOf account conditions', async () => {
    row('a', 'jpy', -900, -1500);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1500 },
      ],
    });
    const rule = await db.first<{ id: string }>(
      'SELECT rule AS id FROM schedules WHERE id = ?',
      [id],
    );
    db.runQuery('UPDATE rules SET actions = ? WHERE id = ?', [
      JSON.stringify([
        { op: 'link-schedule', value: id },
        {
          op: 'set-split-amount',
          value: -500,
          options: { splitIndex: 1, method: 'fixed-amount' },
        },
      ]),
      rule!.id,
    ]);
    await expect(
      previewCurrencyCorrection({
        account: 'jpy',
        currency: 'KWD',
        mode: 'keep',
      }),
    ).rejects.toThrow('correction-schedule-action-unsupported');

    db.runQuery('UPDATE rules SET conditions = ? WHERE id = ?', [
      JSON.stringify([
        { op: 'oneOf', field: 'account', value: ['jpy', 'jpy2'] },
        { op: 'isapprox', field: 'date', value: monthly },
      ]),
      rule!.id,
    ]);
    await expect(
      previewCurrencyCorrection({
        account: 'jpy',
        currency: 'KWD',
        mode: 'keep',
      }),
    ).rejects.toThrow('account-currency-has-schedules');
  });

  it("clears a counterpart's link to a schedule of the account", async () => {
    await saveRate('KWD', '0.3');
    // Convert values the yen schedule amount before re-encoding it.
    await saveRate('JPY', '150');
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1500 },
      ],
    });
    row('a', 'jpy', -900, -1500, {
      transfer: { id: 'b', account: 'jpy2' },
      schedule: id,
    });
    row('b', 'jpy2', 900, 1500, {
      transfer: { id: 'a', account: 'jpy' },
      schedule: id,
    });
    const { preview, result } = await correct('jpy', 'KWD', 'convert');
    expect(result.status).toBe('ok');
    expect(preview.rows.find(r => r.id === 'b')).toMatchObject({
      external: true,
      scheduleUnlinked: true,
    });
    expect(stored('b')?.schedule).toBeNull();
    expect(stored('a')?.schedule).toBe(id);
  });

  it("clears a deleted row's link to another account's schedule", async () => {
    await saveRate('JPY', '150');
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd2' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    row('a', 'usd', -1000, null);
    row('d', 'usd', -1000, null, { schedule: id });
    db.runQuery('UPDATE transactions SET tombstone = 1 WHERE id = ?', ['d']);
    const { preview, result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
    expect(preview.rows.find(r => r.id === 'd')).toMatchObject({
      scheduleUnlinked: true,
    });
    expect(stored('d')).toMatchObject({
      transaction_amount: -1500,
      schedule: null,
    });
  });

  it('still blocks a direct currency change on an empty account with a schedule', async () => {
    await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd2' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    await updateAccount({
      id: 'usd2',
      name: 'Savings',
      currency: 'JPY',
    } as never).catch(() => undefined);
    expect(
      db.firstSync<{ currency: string | null }>(
        'SELECT currency FROM accounts WHERE id = ?',
        ['usd2'],
      )?.currency,
    ).toBeNull();
  });

  it('leaves auxiliary link rules and templated actions base-valued', async () => {
    await saveRate('KWD', '0.3');
    row('a', 'jpy', -900, -1500);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1500 },
      ],
    });
    const ownRule = db.firstSync<{ id: string; actions: string }>(
      'SELECT r.id, r.actions FROM schedules s JOIN rules r ON r.id = s.rule WHERE s.id = ?',
      [id],
    )!;
    const templated = {
      op: 'set',
      field: 'amount',
      value: 0,
      options: { template: '{{amount}}' },
    };
    db.runQuery('UPDATE rules SET actions = ? WHERE id = ?', [
      JSON.stringify([...JSON.parse(ownRule.actions), templated]),
      ownRule.id,
    ]);
    const auxiliary = JSON.stringify([
      { op: 'is', field: 'amount', value: -1000 },
      { op: 'is', field: 'account', value: 'jpy' },
    ]);
    db.runQuery(
      `INSERT INTO rules (id, stage, conditions_op, conditions, actions, tombstone)
         VALUES ('aux', NULL, 'and', ?, ?, 0)`,
      [auxiliary, JSON.stringify([{ op: 'link-schedule', value: id }])],
    );
    const { result } = await correct('jpy', 'KWD', 'keep');
    expect(result.status).toBe('ok');
    expect(
      db.firstSync<{ conditions: string }>(
        'SELECT conditions FROM rules WHERE id = ?',
        ['aux'],
      )?.conditions,
    ).toBe(auxiliary);
    const { actions } = await scheduleRule(id);
    expect(actions).toContainEqual(templated);
  });

  it('lets an outside transfer schedule become an exchange schedule', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd2' },
        { op: 'is', field: 'payee', value: payeeOf('usd') },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    const { result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
  });

  it('rejects an outside payee action whose transfer to the account would cross encodings', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd2' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    await addAction(id, { op: 'set', field: 'payee', value: payeeOf('usd') });
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('account-currency-has-schedules');
  });

  async function addAction(scheduleId: string, action: Rule) {
    const rule = await db.first<{ id: string; actions: string }>(
      'SELECT r.id, r.actions FROM schedules s JOIN rules r ON r.id = s.rule WHERE s.id = ?',
      [scheduleId],
    );
    db.runQuery('UPDATE rules SET actions = ? WHERE id = ?', [
      JSON.stringify([...JSON.parse(rule!.actions), action]),
      rule!.id,
    ]);
  }

  it('rejects a payee action crossing encodings and lets a payee condition become an exchange schedule', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const viaAction = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    await addAction(viaAction, {
      op: 'set',
      field: 'payee',
      value: payeeOf('usd2'),
    });
    const preview = () =>
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      });
    await expect(preview()).rejects.toThrow('account-currency-has-schedules');

    const { rule } = db.firstSync<{ rule: string }>(
      'SELECT rule FROM schedules WHERE id = ?',
      [viaAction],
    )!;
    await db.delete_('schedules', viaAction);
    await db.delete_('rules', rule);
    await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd' },
        { op: 'is', field: 'payee', value: payeeOf('usd2') },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    const { result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
  });

  it('keeps an exchange schedule an exchange', async () => {
    await saveRate('JPY', '150');
    await saveRate('KWD', '0.3');
    row('a', 'jpy', -1000, -1500);
    await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'is', field: 'payee', value: payeeOf('usd') },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1500 },
      ],
    });
    const { result } = await correct('jpy', 'KWD', 'convert');
    expect(result.status).toBe('ok');
  });

  it('rejects an auxiliary link rule whose payee action would cross encodings', async () => {
    await saveRate('KWD', '0.3');
    row('a', 'jpy', -900, -1500);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1500 },
      ],
    });
    db.runQuery(
      `INSERT INTO rules (id, stage, conditions_op, conditions, actions, tombstone)
         VALUES ('aux', NULL, 'and', ?, ?, 0)`,
      [
        JSON.stringify([{ op: 'is', field: 'account', value: 'jpy' }]),
        JSON.stringify([
          { op: 'link-schedule', value: id },
          { op: 'set', field: 'payee', value: payeeOf('jpy2') },
        ]),
      ],
    );
    await expect(
      previewCurrencyCorrection({
        account: 'jpy',
        currency: 'KWD',
        mode: 'convert',
      }),
    ).rejects.toThrow('account-currency-has-schedules');
  });

  it('lets an exchange schedule become a zero base transfer', async () => {
    await saveRate('JPY', '300');
    row('a', 'jpy', -1, -1);
    await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'is', field: 'payee', value: payeeOf('usd') },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1 },
      ],
    });
    const { result } = await correct('jpy', null, 'convert');
    expect(result.status).toBe('ok');
  });

  it('rejects a payee list reaching the account with split actions', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd2' },
        { op: 'is', field: 'payee', value: payeeOf('usd') },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    db.runQuery(
      `INSERT INTO rules (id, stage, conditions_op, conditions, actions, tombstone)
         VALUES ('aux', NULL, 'and', ?, ?, 0)`,
      [
        JSON.stringify([
          { op: 'is', field: 'account', value: 'usd2' },
          { op: 'oneOf', field: 'payee', value: [payeeOf('usd')] },
        ]),
        JSON.stringify([
          { op: 'link-schedule', value: id },
          {
            op: 'set-split-amount',
            value: null,
            options: { splitIndex: 1, method: 'remainder' },
          },
        ]),
      ],
    );
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('account-currency-has-schedules');
  });

  it('rejects a second payee condition reaching the account with split actions', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const shop = await db.insertPayee({ name: 'Shop' });
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd2' },
        { op: 'is', field: 'payee', value: payeeOf('usd') },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    db.runQuery(
      `INSERT INTO rules (id, stage, conditions_op, conditions, actions, tombstone)
         VALUES ('aux', NULL, 'or', ?, ?, 0)`,
      [
        JSON.stringify([
          { op: 'is', field: 'payee', value: shop },
          { op: 'is', field: 'payee', value: payeeOf('usd') },
        ]),
        JSON.stringify([
          { op: 'link-schedule', value: id },
          {
            op: 'set-split-amount',
            value: null,
            options: { splitIndex: 1, method: 'remainder' },
          },
        ]),
      ],
    );
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('account-currency-has-schedules');
  });

  it('ignores a payee list that excludes the account', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd2' },
        { op: 'notOneOf', field: 'payee', value: [payeeOf('usd')] },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    await addAction(id, {
      op: 'set-split-amount',
      value: null,
      options: { splitIndex: 1, method: 'remainder' },
    });
    const { result } = await correct('usd', 'JPY', 'convert');
    expect(result.status).toBe('ok');
  });

  it('rejects a schedule moving its posting to an account left behind', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    await addAction(id, { op: 'set', field: 'account', value: 'usd2' });
    await expect(
      previewCurrencyCorrection({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
      }),
    ).rejects.toThrow('account-currency-has-schedules');
  });

  it('goes stale when a row gains a schedule link', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    db.runQuery('UPDATE transactions SET schedule = ? WHERE id = ?', [id, 'a']);
    expect(
      await correctAccountCurrency({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
        fingerprint: preview.fingerprint,
      }),
    ).toEqual({ status: 'stale' });
  });

  it('goes stale when a schedule gains an unsupported action', async () => {
    await saveRate('JPY', '150');
    row('a', 'usd', -1000, null);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1000 },
      ],
    });
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    await addAction(id, {
      op: 'set-split-amount',
      value: -500,
      options: { splitIndex: 1, method: 'fixed-amount' },
    });
    expect(
      await correctAccountCurrency({
        account: 'usd',
        currency: 'JPY',
        mode: 'convert',
        fingerprint: preview.fingerprint,
      }),
    ).toEqual({ status: 'stale' });
  });

  it('values a locally advanced schedule at its current occurrence', async () => {
    await saveRate('JPY', '150');
    await saveRate('JPY', '100', '2017-02-01');
    row('a', 'jpy', -900, -1500);
    const id = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: -1500 },
      ],
    });
    const advance = (date: number) =>
      db.runQuery(
        `UPDATE schedules_next_date SET local_next_date = ?,
           local_next_date_ts = base_next_date_ts WHERE schedule_id = ?`,
        [date, id],
      );
    advance(20170210);
    const preview = await previewCurrencyCorrection({
      account: 'jpy',
      currency: null,
      mode: 'convert',
    });
    // ¥1,500 at 100 (from February) is $15.00.
    expect(preview.schedules[0].date).toBe('2017-02-10');
    expect(
      (preview.schedules[0].after!.conditions as Rule[]).find(
        c => c.field === 'amount',
      )!.value,
    ).toBe(-1500);
    advance(20170310);
    expect(
      await correctAccountCurrency({
        account: 'jpy',
        currency: null,
        mode: 'convert',
        fingerprint: preview.fingerprint,
      }),
    ).toEqual({ status: 'stale' });
  });
});

describe('missing rate quotes', () => {
  const monthly = {
    start: '2017-01-10',
    frequency: 'monthly' as const,
    patterns: [],
    skipWeekend: false,
    weekendSolveMode: 'after' as const,
    endMode: 'never' as const,
  };
  const scheduleOf = (account: string, amount: number) =>
    createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: account },
        { op: 'isapprox', field: 'date', value: monthly },
        { op: 'is', field: 'amount', value: amount },
      ],
    });
  const setDate = (id: string, date: number) =>
    db.runQuery('UPDATE transactions SET date = ? WHERE id = ?', [date, id]);

  it("lists a schedule's missing source rate for a correction to the budget currency", async () => {
    row('a', 'jpy', -1000, -1500);
    await scheduleOf('jpy', -1500);
    const preview = await previewCurrencyCorrection({
      account: 'jpy',
      currency: null,
      mode: 'convert',
    });
    expect(preview.missingRateQuotes).toEqual([
      { date: '2017-01-10', currency: 'JPY' },
    ]);
  });

  it('lists only the quote that fails', async () => {
    row('a', 'jpy', -1000, -1500);
    await scheduleOf('jpy', -1500);
    await saveRate('EUR', '0.9');
    const one = await previewCurrencyCorrection({
      account: 'jpy',
      currency: 'EUR',
      mode: 'convert',
    });
    expect(one.missingRateQuotes).toEqual([
      { date: '2017-01-10', currency: 'JPY' },
    ]);
  });

  it('lists both quotes of a schedule when neither rate exists', async () => {
    await scheduleOf('jpy', -1500);
    const preview = await previewCurrencyCorrection({
      account: 'jpy',
      currency: 'EUR',
      mode: 'convert',
    });
    expect(preview.missingRateQuotes).toEqual([
      { date: '2017-01-10', currency: 'EUR' },
      { date: '2017-01-10', currency: 'JPY' },
    ]);
  });

  it('sorts dates and uses a family parent date', async () => {
    row('a', 'usd', -1000, null);
    row('b', 'usd', -2000, null);
    setDate('a', 20170301);
    setDate('b', 20170105);
    row('p', 'usd', -900, null, { isParent: true });
    row('c1', 'usd', -400, null, { parent: 'p' });
    row('c2', 'usd', -500, null, { parent: 'p' });
    setDate('c2', 20170220);
    const preview = await previewCurrencyCorrection({
      account: 'usd',
      currency: 'JPY',
      mode: 'convert',
    });
    expect(preview.missingRateQuotes).toEqual([
      { date: '2017-01-05', currency: 'JPY' },
      { date: '2017-01-10', currency: 'JPY' },
      { date: '2017-03-01', currency: 'JPY' },
    ]);
  });
});

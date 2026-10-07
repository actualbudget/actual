import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import { undo } from '#server/undo';

import { app } from './app';
import { insertRule, loadRules } from './transaction-rules';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const post = app.handlers['transactions/post-foreign-entry'];

async function setBudget() {
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
}

function snapshot() {
  return {
    transactions: db.runQuery('SELECT id FROM transactions', [], true).length,
    rates: db.runQuery('SELECT id FROM exchange_rates', [], true).length,
    payees: db.runQuery('SELECT id FROM payees', [], true).length,
    mappings: db.runQuery('SELECT id FROM payee_mapping', [], true).length,
  };
}

const draft = {
  id: 'draft',
  account: 'jpy',
  date: '2026-03-10',
  transaction_amount: -1500,
};

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await setBudget();
  await loadRules();
  await db.insertAccount({ id: 'jpy', name: 'Yen', currency: 'JPY' });
  await db.insertAccount({ id: 'jpy2', name: 'Yen 2', currency: 'JPY' });
  await db.insertAccount({ id: 'kwd', name: 'Dinar', currency: 'KWD' });
});

describe('transactions/post-foreign-entry', () => {
  it('posts the displayed base amount as a frozen pair', async () => {
    expect(await post({ transaction: draft, baseAmount: -1000 })).toEqual({
      status: 'ok',
      id: 'draft',
    });
    expect(
      db.firstSync(
        "SELECT amount, transaction_amount, amount_pair FROM transactions WHERE id = 'draft'",
      ),
    ).toEqual({
      amount: -1000,
      transaction_amount: -1500,
      amount_pair: '-1000:-1500@jpy',
    });
  });

  it('reports an unavailable rate without writing', async () => {
    const before = snapshot();
    expect(await post({ transaction: draft })).toEqual({
      status: 'rate-unavailable',
    });
    expect(snapshot()).toEqual(before);
  });

  it('saves a supplied rate with the transaction and checks the shown base', async () => {
    const before = snapshot();
    expect(
      await post({ transaction: draft, rate: '150', expectedBaseAmount: -999 }),
    ).toEqual({ status: 'base-changed', baseAmount: -1000 });
    expect(snapshot()).toEqual(before);
    expect(
      await post({
        transaction: draft,
        rate: '150',
        expectedBaseAmount: -1000,
      }),
    ).toMatchObject({ status: 'ok' });
    expect(snapshot()).toMatchObject({
      transactions: before.transactions + 1,
      rates: before.rates + 1,
    });
  });

  it('reuses the first typed rate on that day and does not keep it standing', async () => {
    await post({ transaction: draft, rate: '150' });
    expect(
      await post({
        transaction: { ...draft, id: 'later', date: '2026-04-02' },
      }),
    ).toEqual({ status: 'rate-unavailable' });
    expect(
      await post({ transaction: { ...draft, id: 'same-day' } }),
    ).toMatchObject({ status: 'ok' });
    expect(
      db.firstSync("SELECT amount FROM transactions WHERE id = 'same-day'"),
    ).toEqual({ amount: -1000 });
  });

  it('saves a standing rate from the entry date when asked', async () => {
    await post({ transaction: draft, rate: '150', saveStanding: true });
    expect(
      await post({
        transaction: { ...draft, id: 'later', date: '2026-04-02' },
      }),
    ).toMatchObject({ status: 'ok' });
    expect(
      db.firstSync("SELECT amount FROM transactions WHERE id = 'later'"),
    ).toEqual({ amount: -1000 });
  });

  it('leaves the day rate in place when a later entry uses another rate', async () => {
    await post({ transaction: draft, rate: '150' });
    const before = snapshot();
    expect(
      await post({ transaction: { ...draft, id: 'second' }, rate: '125' }),
    ).toMatchObject({ status: 'ok' });
    expect(snapshot().rates).toBe(before.rates);
    expect(
      db.firstSync("SELECT amount FROM transactions WHERE id = 'second'"),
    ).toEqual({ amount: -1200 });
  });

  it('confirms before replacing a standing rate, writing nothing', async () => {
    await post({ transaction: draft, rate: '150', saveStanding: true });
    const before = snapshot();
    expect(
      await post({
        transaction: { ...draft, id: 'second' },
        rate: '125',
        saveStanding: true,
      }),
    ).toMatchObject({
      status: 'rate-confirmation-required',
      existing: { rate: '150', kind: 'standing' },
    });
    expect(snapshot()).toEqual(before);
  });

  it('applies non-amount rule results from base amount conditions', async () => {
    await db.insertCategoryGroup({ id: 'group', name: 'Spending' });
    await db.insertCategory({ id: 'food', name: 'Food', cat_group: 'group' });
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'amount', value: -1000 }],
      actions: [
        { op: 'set', field: 'category', value: 'food' },
        { op: 'set', field: 'notes', value: 'matched base' },
      ],
    });
    await post({ transaction: draft, baseAmount: -1000 });
    expect(
      db.firstSync(
        "SELECT category, notes FROM transactions WHERE id = 'draft'",
      ),
    ).toEqual({ category: 'food', notes: 'matched base' });
  });

  it('rejects a rule that retargets the pair to another currency, writing nothing', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'notes', value: 'move' }],
      actions: [
        { op: 'set', field: 'account', value: 'kwd' },
        { op: 'set', field: 'payee_name', value: 'Rule payee' },
      ],
    });
    const before = snapshot();
    expect(
      await post({
        transaction: { ...draft, notes: 'move' },
        rate: '150',
      }),
    ).toEqual({ status: 'rule-account-incompatible' });
    expect(snapshot()).toEqual(before);
  });

  it('keeps the pair when a rule moves it to a matching account', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'notes', value: 'move' }],
      actions: [{ op: 'set', field: 'account', value: 'jpy2' }],
    });
    await post({ transaction: { ...draft, notes: 'move' }, baseAmount: -1000 });
    expect(
      db.firstSync(
        "SELECT acct, amount, transaction_amount FROM transactions WHERE id = 'draft'",
      ),
    ).toEqual({ acct: 'jpy2', amount: -1000, transaction_amount: -1500 });
  });

  it('asks again when a rule changes the date, writing nothing', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'notes', value: 'redate' }],
      actions: [{ op: 'set', field: 'date', value: '2026-03-11' }],
    });
    const before = snapshot();
    expect(
      await post({
        transaction: { ...draft, notes: 'redate' },
        baseAmount: -1000,
      }),
    ).toEqual({ status: 'rule-date-changed', date: '2026-03-11' });
    expect(snapshot()).toEqual(before);
  });

  it('records one undo step for the rate and transaction', async () => {
    await post({ transaction: draft, rate: '150' });
    await undo();
    expect(
      db.runQuery('SELECT id FROM transactions WHERE tombstone = 0', [], true),
    ).toEqual([]);
    expect(
      db.runQuery(
        'SELECT id FROM exchange_rates WHERE tombstone = 0',
        [],
        true,
      ),
    ).toEqual([]);
  });

  it('creates a payee typed during entry only when the entry posts', async () => {
    const before = snapshot();
    expect(
      await post({ transaction: { ...draft, payee_name: 'Ramen Shop' } }),
    ).toEqual({ status: 'rate-unavailable' });
    expect(snapshot()).toEqual(before);

    await post({
      transaction: { ...draft, payee_name: 'Ramen Shop' },
      baseAmount: -1000,
    });
    const row = db.firstSync<{ name: string }>(
      "SELECT p.name FROM transactions t JOIN payees p ON p.id = t.description WHERE t.id = 'draft'",
    );
    expect(row?.name).toBe('Ramen Shop');
    expect(snapshot()).toMatchObject({
      payees: before.payees + 1,
      mappings: before.mappings + 1,
    });
  });

  it('reuses an existing payee with the typed name', async () => {
    const id = await db.insertPayee({ name: 'Ramen Shop' });
    const before = snapshot();
    await post({
      transaction: { ...draft, payee_name: 'ramen shop' },
      baseAmount: -1000,
    });
    expect(
      db.firstSync("SELECT description FROM transactions WHERE id = 'draft'"),
    ).toEqual({ description: id });
    expect(snapshot().payees).toBe(before.payees);
  });

  it('lets rules match the name of a payee typed during entry', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'notes', value: 'name me' }],
      actions: [
        {
          op: 'set',
          field: 'notes',
          value: null,
          options: { formula: '=payee_name' },
        },
      ],
    });
    await post({
      transaction: { ...draft, notes: 'name me', payee_name: 'Ramen Shop' },
      baseAmount: -1000,
    });
    expect(
      db.firstSync("SELECT notes FROM transactions WHERE id = 'draft'"),
    ).toEqual({ notes: 'Ramen Shop' });
  });

  it('stores no category for an off-budget foreign account', async () => {
    await db.insertCategoryGroup({ id: 'group', name: 'Spending' });
    await db.insertCategory({ id: 'food', name: 'Food', cat_group: 'group' });
    await db.insertAccount({
      id: 'jpy-off',
      name: 'Yen savings',
      currency: 'JPY',
      offbudget: 1,
    });
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'notes', value: 'off' }],
      actions: [{ op: 'set', field: 'account', value: 'jpy-off' }],
    });
    await post({
      transaction: { ...draft, notes: 'off', category: 'food' },
      baseAmount: -1000,
    });
    expect(
      db.firstSync(
        "SELECT acct, category FROM transactions WHERE id = 'draft'",
      ),
    ).toEqual({ acct: 'jpy-off', category: null });
  });

  it('rejects split drafts before writing anything', async () => {
    const before = snapshot();
    for (const transaction of [
      { ...draft, is_parent: true },
      { ...draft, is_child: true, parent_id: 'parent' },
      { ...draft, subtransactions: [{ ...draft, id: 'child', amount: -1000 }] },
    ]) {
      await expect(post({ transaction, baseAmount: -1000 })).rejects.toThrow(
        'foreign-split-unavailable',
      );
    }
    expect(snapshot()).toEqual(before);
  });

  it('rejects base-currency accounts', async () => {
    await db.insertAccount({ id: 'usd', name: 'Checking' });
    await expect(
      post({ transaction: { ...draft, account: 'usd' }, baseAmount: -1 }),
    ).rejects.toThrow('rate-currency-invalid');
  });
});

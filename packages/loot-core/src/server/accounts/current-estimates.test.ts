import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { exchangeRateId } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { q } from '#shared/query';

import { getCurrentEstimates } from './current-estimates';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

async function rate(
  quote: string,
  value: string,
  kind: 'dated' | 'standing' | 'fetched',
  timestamp: string,
  source = kind === 'fetched' ? 'provider' : 'manual',
) {
  await db.insert('exchange_rates', {
    id: exchangeRateId('USD', quote, source, kind, timestamp),
    base_currency: 'USD',
    quote_currency: quote,
    rate: value,
    kind,
    source,
    timestamp,
    tombstone: 0,
  });
}

let order = 0;
function row(
  id: string,
  account: string,
  amount: number,
  native: number | null,
  fields: { isParent?: boolean; parent?: string; tombstone?: boolean } = {},
) {
  // Seeded directly: estimates only read, and foreign writes have their own
  // handlers and guards.
  db.runQuery(
    `INSERT INTO transactions (id, acct, date, amount, transaction_amount,
       isParent, isChild, parent_id, tombstone, sort_order)
     VALUES (?, ?, 20161201, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      account,
      amount,
      native,
      fields.isParent ? 1 : 0,
      fields.parent ? 1 : 0,
      fields.parent ?? null,
      fields.tombstone ? 1 : 0,
      order++,
    ],
  );
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
  for (const account of [
    { id: 'usd', name: 'Checking' },
    { id: 'yen', name: 'Yen', currency: 'JPY', currency_precision: 0 },
    { id: 'kwd', name: 'Dinar', currency: 'KWD', currency_precision: 3 },
    { id: 'empty', name: 'Empty', currency: 'KWD', currency_precision: 3 },
    {
      id: 'savings',
      name: 'Yen savings',
      currency: 'JPY',
      currency_precision: 0,
      offbudget: 1,
    },
    {
      id: 'closed',
      name: 'Old yen',
      currency: 'JPY',
      currency_precision: 0,
      closed: 1,
    },
  ]) {
    await db.insertAccount(account);
  }
  row('b1', 'usd', 50000, null);
  row('y1', 'yen', -900, -1500);
  row('k1', 'kwd', -1033, -3100);
  row('s1', 'savings', 70000, 100000);
  row('c1', 'closed', 1000, 1500);
});

const byId = (result: Awaited<ReturnType<typeof getCurrentEstimates>>) =>
  Object.fromEntries(result.accounts.map(a => [a.id, a]));

describe('current-rate estimates', () => {
  it("values native balances at today's rate beside stored totals", async () => {
    await rate('JPY', '150', 'standing', '2016-12-01T00:00:00.000Z');
    const result = await getCurrentEstimates();
    expect(result.date).toBe('2017-01-01');
    const accounts = byId(result);
    expect(accounts.yen).toEqual({
      id: 'yen',
      nativeBalance: -1500,
      storedBaseAmount: -900,
      estimate: {
        status: 'resolved',
        baseAmount: -1000,
        rate: '150',
        kind: 'standing',
        source: 'manual',
        timestamp: '2016-12-01T00:00:00.000Z',
        fallback: false,
      },
    });
    expect(accounts.kwd.estimate).toEqual({ status: 'unavailable' });
    expect(accounts.empty.estimate).toEqual({ status: 'zero', baseAmount: 0 });
    expect(accounts.closed).toBeUndefined();
    // Savings: ¥100,000 at 150 is $666.67.
    expect(accounts.savings.estimate).toMatchObject({ baseAmount: 66667 });

    // On budget: $500 - $9 (stored yen) - $10.33 (stored dinar) = $480.67;
    // converted swaps the yen for $10 and leaves the dinar out.
    expect(result.groups.onBudget).toEqual({
      storedBaseAmount: 48067,
      convertedAmount: 50000 - 1000,
      missing: ['kwd'],
    });
    expect(result.groups.offBudget).toEqual({
      storedBaseAmount: 70000,
      convertedAmount: 66667,
      missing: [],
    });
    expect(result.groups.all).toEqual({
      storedBaseAmount: 118067,
      convertedAmount: 50000 - 1000 + 66667,
      missing: ['kwd'],
    });
  });

  it('completes the totals once every nonzero balance has a rate', async () => {
    await rate('JPY', '150', 'standing', '2016-12-01T00:00:00.000Z');
    await rate('KWD', '0.31', 'standing', '2017-01-01T00:00:00.000Z');
    const result = await getCurrentEstimates();
    expect(byId(result).kwd.estimate).toMatchObject({
      status: 'resolved',
      kind: 'standing',
      baseAmount: -1000,
    });
    expect(byId(result).empty.estimate.status).toBe('zero');
    expect(result.groups.onBudget.missing).toEqual([]);
    expect(result.groups.onBudget.convertedAmount).toBe(50000 - 1000 - 1000);
  });

  it('skips a one-day rate', async () => {
    await rate('KWD', '0.31', 'dated', '2017-01-01T00:00:00.000Z');
    expect(byId(await getCurrentEstimates()).kwd.estimate).toEqual({
      status: 'unavailable',
    });
  });

  it('reports fetched and fallback rates', async () => {
    await rate('JPY', '150', 'fetched', '2017-01-01T00:00:00.000Z');
    await rate('KWD', '0.31', 'fetched', '2016-12-28T00:00:00.000Z');
    const accounts = byId(await getCurrentEstimates());
    expect(accounts.yen.estimate).toMatchObject({
      kind: 'fetched',
      source: 'provider',
      fallback: false,
    });
    expect(accounts.kwd.estimate).toMatchObject({
      kind: 'fetched',
      fallback: true,
    });
  });

  it('counts splits once and drops children of deleted parents, as the bindings do', async () => {
    row('p', 'yen', -1000, -1500, { isParent: true });
    row('p1', 'yen', -400, -600, { parent: 'p' });
    row('p2', 'yen', -600, -900, { parent: 'p' });
    // A concurrent split deletion and child addition: the parent is gone,
    // the new child survives in the table.
    row('gone', 'yen', -100, -150, { isParent: true, tombstone: true });
    row('orphan', 'yen', -100, -150, { parent: 'gone' });

    const accounts = byId(await getCurrentEstimates());
    const binding = await aqlQuery(
      q('transactions')
        .filter({ account: 'yen' })
        .options({ splits: 'none' })
        .calculate({ $sum: '$transaction_amount' }),
    );
    expect(accounts.yen.nativeBalance).toBe(binding.data);
    expect(accounts.yen.nativeBalance).toBe(-1500 - 1500);

    const groupBinding = await aqlQuery(
      q('transactions')
        .filter({ 'account.offbudget': false, 'account.closed': false })
        .calculate({ $sum: '$amount' }),
    );
    const { groups } = await getCurrentEstimates();
    expect(groups.onBudget.storedBaseAmount).toBe(groupBinding.data);
    expect(accounts.yen.storedBaseAmount).toBe(-900 - 1000);
  });

  it('uses the parent of a live split family whose children differ', async () => {
    // Two offline devices replaced the children independently.
    row('p', 'yen', -1000, -1000, { isParent: true });
    row('a1', 'yen', -1000, -1000, { parent: 'p' });
    row('b1x', 'yen', -1000, -1000, { parent: 'p' });
    const accounts = byId(await getCurrentEstimates());
    const header = await aqlQuery(
      q('transactions')
        .filter({ account: 'yen' })
        .options({ splits: 'none' })
        .calculate({ $sum: '$transaction_amount' }),
    );
    expect(accounts.yen.nativeBalance).toBe(header.data);
    expect(accounts.yen.nativeBalance).toBe(-1500 - 1000);

    // The recorded base matches the account balance binding (parents), the
    // group total the sidebar's inline group binding.
    const accountBinding = await aqlQuery(
      q('transactions')
        .filter({ account: 'yen' })
        .options({ splits: 'none' })
        .calculate({ $sum: '$amount' }),
    );
    expect(accounts.yen.storedBaseAmount).toBe(accountBinding.data);
    expect(accounts.yen.storedBaseAmount).toBe(-900 - 1000);
    const groupBinding = await aqlQuery(
      q('transactions')
        .filter({ 'account.offbudget': false, 'account.closed': false })
        .calculate({ $sum: '$amount' }),
    );
    const { groups } = await getCurrentEstimates();
    expect(groups.onBudget.storedBaseAmount).toBe(groupBinding.data);
    // Converted: the yen account's inline share (-900 - 2000) is replaced
    // by its estimate; the dinar has no rate.
    expect(groups.onBudget.convertedAmount).toBe(
      (groupBinding.data as number) - (-900 - 2000) - -1033,
    );
  });

  it('is unavailable without multicurrency', async () => {
    await db.update('preferences', {
      id: 'flags.multicurrency',
      value: 'false',
    });
    await expect(getCurrentEstimates()).rejects.toThrow(
      'multicurrency-unavailable',
    );
  });
});

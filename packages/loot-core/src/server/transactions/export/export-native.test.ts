import { parse as csvParse } from 'csv-parse/sync';

import { app as accountsApp } from '#server/accounts/app';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import { q } from '#shared/query';
import { integerToAmount } from '#shared/util';

import { exportQueryToCSV, exportToCSV } from './export-to-csv';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const date = '2026-03-10';
type Row = Record<string, string>;

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'USD',
      precision: 2,
    }),
  });
  await db.insertAccount({ id: 'usd', name: 'Checking' });
  await db.insertAccount({
    id: 'jpy',
    name: 'Yen',
    currency: 'JPY',
    currency_precision: 0,
  });
  await db.insertAccount({
    id: 'kwd',
    name: 'Dinar',
    currency: 'KWD',
    currency_precision: 3,
  });
  await db.insertTransaction({ id: 'b', account: 'usd', date, amount: -500 });
  await db.insertTransaction({
    id: 'k',
    account: 'kwd',
    date,
    amount: -1033,
    transaction_amount: -3100,
  });
  await db.insertTransaction({
    id: 'y',
    account: 'jpy',
    date,
    amount: -700,
    transaction_amount: -1050,
  });
  // The export only reads, so the split family is seeded directly; its
  // writes go through the foreign split handler.
  for (const [id, amount, native, isParent, parent] of [
    ['p', -1000, -1500, 1, null],
    ['c1', -400, -600, 0, 'p'],
    ['c2', -600, -900, 0, 'p'],
  ] as const) {
    db.runQuery(
      `INSERT INTO transactions (id, acct, date, amount, transaction_amount,
         isParent, isChild, parent_id, tombstone, sort_order)
       VALUES (?, 'jpy', 20260310, ?, ?, ?, ?, ?, 0, ?)`,
      [id, amount, native, isParent, parent ? 1 : 0, parent, Date.now()],
    );
  }
});

async function queryRows(accountId?: string) {
  const query = q('transactions').filter(
    accountId ? { account: accountId } : {},
  );
  return csvParse(await exportQueryToCSV(query), { columns: true }) as Row[];
}

describe('native export columns', () => {
  it('adds currency and native amounts to foreign rows only', async () => {
    const rows = await queryRows();
    const byAmount = (amount: string) => rows.filter(r => r.Amount === amount);
    expect(byAmount('-5')[0]).toMatchObject({
      Currency: '',
      'Native amount': '',
      Split_Native_Amount: '',
    });
    expect(byAmount('-10.33')[0]).toMatchObject({
      Account: 'Dinar',
      Currency: 'KWD',
      'Native amount': '-3.1',
    });
    expect(byAmount('-7')[0]).toMatchObject({
      Currency: 'JPY',
      'Native amount': '-1050',
    });
  });

  it('keeps split parents additive like the base columns', async () => {
    const rows = await queryRows('jpy');
    const parent = rows.find(r => r.Split_Amount === '-10')!;
    expect(parent).toMatchObject({
      Amount: '0',
      'Native amount': '0',
      Split_Native_Amount: '-1500',
    });
    const children = rows.filter(r => /^\(SPLIT \d/.test(r.Notes));
    expect(children.map(r => r['Native amount'])).toEqual(['-600', '-900']);
    expect(children.every(r => r.Split_Native_Amount === '')).toBe(true);
    expect(
      children.reduce((sum, r) => sum + Number(r['Native amount']), 0),
    ).toBe(Number(parent.Split_Native_Amount));

    // An unfiltered single-account export sums to the native balance.
    const balance = await accountsApp.handlers['account-balance']({
      id: 'jpy',
      cutoff: new Date('2030-01-01'),
    });
    expect(rows.reduce((sum, r) => sum + Number(r['Native amount']), 0)).toBe(
      integerToAmount(balance, 0),
    );
  });

  it('writes stored native amounts in the plain export', async () => {
    const accounts = db.runQuery<{
      id: string;
      name: string;
      currency: string | null;
      currency_precision: number | null;
    }>('SELECT id, name, currency, currency_precision FROM accounts', [], true);
    const csv = await exportToCSV(
      [
        { account: 'usd', date, amount: -500 },
        { account: 'kwd', date, amount: -1033, transaction_amount: -3100 },
      ],
      accounts,
      [],
      [],
    );
    const rows = csvParse(csv, { columns: true }) as Row[];
    expect(rows.map(r => [r.Amount, r.Currency, r['Native amount']])).toEqual([
      ['-5', '', ''],
      ['-10.33', 'KWD', '-3.1'],
    ]);
  });
});

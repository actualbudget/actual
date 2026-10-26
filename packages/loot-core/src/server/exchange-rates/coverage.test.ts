import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { toDateRepr } from '#server/models';
import * as prefs from '#server/prefs';

import { exchangeRateId } from './app';
import {
  iterateMissingRateDates,
  readFetchedDays,
  readMissingRateRanges,
} from './coverage';

const today = '2026-03-10';
const source = 'plugin:exchange-api';

async function account(id: string, currency: string, closed = 0) {
  await db.insert('accounts', { id, name: id, currency, closed, tombstone: 0 });
}
let next = 0;
async function transaction(
  acct: string,
  date: string,
  native = 100,
  tombstone = 0,
) {
  await db.insert('transactions', {
    id: `t${++next}`,
    acct,
    amount: native,
    transaction_amount: native,
    date: toDateRepr(date),
    isParent: 0,
    tombstone,
  });
}
async function fetched(quote: string, date: string, tombstone = 0) {
  const timestamp = `${date}T00:00:00.000Z`;
  const row = {
    id: exchangeRateId('USD', quote, source, 'fetched', timestamp),
    base_currency: 'USD',
    quote_currency: quote,
    rate: '150',
    kind: 'fetched',
    source,
    timestamp,
    tombstone,
  };
  await db.insert('exchange_rates', {
    ...row,
    spec: JSON.stringify({ rate: '150', kind: 'fetched' }),
  });
}
async function keys(gaps = new Set<string>()) {
  const ranges = await readMissingRateRanges('USD', today);
  const found: string[] = [];
  for await (const key of iterateMissingRateDates(
    ranges,
    await readFetchedDays('USD', source),
    key => gaps.has(`${key.quoteCurrency}|${key.date}`),
    today,
  )) {
    found.push(`${key.quoteCurrency}|${key.date}`);
  }
  return found;
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  next = 0;
});

it('merges accounts of one currency into continuous ranges through today', async () => {
  await account('a', 'JPY');
  await account('b', 'JPY');
  await transaction('a', '2026-03-05');
  await transaction('b', '2026-03-02');
  // Deleted and future transactions do not extend the range.
  await transaction('b', '2026-02-01', 100, 1);
  await transaction('a', '2026-03-20');
  expect(await readMissingRateRanges('USD', today)).toEqual([
    { quoteCurrency: 'JPY', from: '2026-03-02', to: today },
  ]);
});

it('asks only today for an open account without transactions', async () => {
  await account('a', 'EUR');
  expect(await readMissingRateRanges('USD', today)).toEqual([
    { quoteCurrency: 'EUR', from: today, to: today },
  ]);
});

it('ends a closed account at its last transaction unless it still holds a balance', async () => {
  await account('zero', 'EUR', 1);
  await transaction('zero', '2026-01-01', 100);
  await transaction('zero', '2026-01-03', -100);
  await account('held', 'JPY', 1);
  await transaction('held', '2026-01-02', 100);
  await account('empty', 'GBP', 1);
  expect(await readMissingRateRanges('USD', today)).toEqual([
    { quoteCurrency: 'EUR', from: '2026-01-01', to: '2026-01-03' },
    { quoteCurrency: 'JPY', from: '2026-01-02', to: today },
  ]);
});

it('keeps separate ranges for histories that do not touch', async () => {
  await account('old', 'EUR', 1);
  await transaction('old', '2025-01-01', 100);
  await transaction('old', '2025-01-02', -100);
  await account('new', 'EUR');
  await transaction('new', '2026-03-09');
  expect(await readMissingRateRanges('USD', today)).toEqual([
    { quoteCurrency: 'EUR', from: '2025-01-01', to: '2025-01-02' },
    { quoteCurrency: 'EUR', from: '2026-03-09', to: today },
  ]);
});

it('lists today, month ends and transaction dates first, then the remaining holes', async () => {
  await account('a', 'JPY');
  await transaction('a', '2026-02-25');
  await transaction('a', '2026-03-04');
  await fetched('JPY', '2026-03-09');
  // A deleted observation is a hole again.
  await fetched('JPY', '2026-03-08', 1);
  const found = await keys(new Set(['JPY|2026-03-01']));
  expect(found.slice(0, 4)).toEqual([
    'JPY|2026-03-10',
    'JPY|2026-03-04',
    'JPY|2026-02-28',
    'JPY|2026-02-25',
  ]);
  expect(found).toContain('JPY|2026-03-08');
  expect(found).not.toContain('JPY|2026-03-09');
  expect(found).not.toContain('JPY|2026-03-01');
  expect(new Set(found).size).toBe(found.length);
  // Fourteen days from 2026-02-25, less one fetched day and one settled gap.
  expect(found).toHaveLength(14 - 2);
});

it('rotates between currencies so one long history does not starve another', async () => {
  await account('a', 'JPY');
  await transaction('a', '2025-03-10');
  await account('b', 'EUR');
  const found = await keys();
  expect(found.slice(0, 2).sort()).toEqual([
    'EUR|2026-03-10',
    'JPY|2026-03-10',
  ]);
});

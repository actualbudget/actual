import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import { setSqlConversionState } from '#shared/fx/sql';
import * as monthUtils from '#shared/months';

import type { FetchFn } from './providers/frankfurter';
import { loadSqlConversionState } from './sqlState';
import { getExchangeRates } from './store';
import { findMissingExchangeRates, updateExchangeRates } from './update';

// CAD is worth 0.7 USD and 2,000 COP every day
const RATES: Record<string, number> = { USD: 0.7, COP: 2000 };
const SUPPORTED = ['CAD', 'COP', 'USD'];

function getDates(from: string, to: string, group: string | null) {
  const dates: string[] = [];
  if (group === 'month') {
    for (
      let month = monthUtils.monthFromDate(from);
      month <= monthUtils.monthFromDate(to);
      month = monthUtils.addMonths(month, 1)
    ) {
      dates.push(`${month}-01`);
    }
    return dates;
  }
  for (let day = from; day <= to; day = monthUtils.addDays(day, 1)) {
    dates.push(day);
  }
  return dates;
}

function createFetch({
  failing = [] as string[],
  // Days the provider has no rate for, like holidays
  skip = [] as string[],
  // The first day the provider has rates for, per currency
  starts = {} as Record<string, string>,
  // Answers without any rate, like a server still filling its history
  empty = false,
} = {}) {
  return vi.fn<FetchFn>(async input => {
    const url = new URL(input);
    if (url.pathname === '/v2/currencies') {
      return {
        ok: true,
        status: 200,
        json: async () =>
          SUPPORTED.map(code => ({
            iso_code: code,
            start_date: starts[code],
          })),
      };
    }
    const base = url.searchParams.get('base') ?? '';
    const quote = url.searchParams.get('quotes') ?? '';
    if (failing.includes(quote)) {
      return { ok: false, status: 500, json: async () => ({}) };
    }
    const dates = getDates(
      url.searchParams.get('from') ?? '',
      url.searchParams.get('to') ?? '',
      url.searchParams.get('group'),
    );
    return {
      ok: true,
      status: 200,
      json: async () =>
        dates
          .filter(date => !empty && !skip.includes(date))
          .map(date => ({ date, base, quote, rate: RATES[quote] })),
    };
  });
}

function getRateCalls(fetchFn: ReturnType<typeof createFetch>) {
  return fetchFn.mock.calls
    .map(([input]) => new URL(input))
    .filter(url => url.pathname === '/v2/rates')
    .map(url => Object.fromEntries(url.searchParams));
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  // Saving rates reloads the conversion state from these preferences
  for (const [id, value] of [
    ['flags.currency', 'true'],
    ['flags.multiCurrency', 'true'],
    ['defaultCurrencyCode', 'CAD'],
  ]) {
    await db.update('preferences', { id, value });
  }
  loadSqlConversionState();
  await prefs.loadPrefs();
  await db.insertAccount({ id: 'cad', name: 'Chequing' });
  await db.insertAccount({ id: 'usd', name: 'US', currency: 'USD' });
  await db.insertTransaction({
    account: 'usd',
    amount: -1000,
    date: '2015-08-15',
  });
});

// Tests run on 2017-01-01 (see `currentDay`)
afterEach(() => {
  setSqlConversionState({
    enabled: false,
    defaultCurrencyCode: '',
    rateMode: 'latest',
    rates: [],
  });
});

describe('updateExchangeRates', () => {
  it('fills in monthly history before the last year and daily rates since', async () => {
    const fetchFn = createFetch();

    const result = await updateExchangeRates({ fetchFn });

    expect(getRateCalls(fetchFn)).toEqual([
      {
        base: 'CAD',
        quotes: 'USD',
        from: '2015-08-15',
        to: '2016-01-01',
        group: 'month',
      },
      { base: 'CAD', quotes: 'USD', from: '2016-01-02', to: '2017-01-01' },
    ]);
    const rates = await getExchangeRates();
    expect(rates).toHaveLength(result.added);
    expect(result).toMatchObject({ unsupported: [], errors: [] });
    // Six months, then every day of the last year
    expect(result.added).toBe(6 + 366);
    expect(rates[0]).toMatchObject({
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: Number((1 / 0.7).toPrecision(10)),
      source: 'frankfurter',
    });
  });

  it('only fetches the days missing since the last update', async () => {
    await fetchAll();
    await deleteFetchedRates(date => date >= '2016-12-30');
    const fetchFn = createFetch();

    const result = await updateExchangeRates({ fetchFn });

    expect(getRateCalls(fetchFn)).toEqual([
      { base: 'CAD', quotes: 'USD', from: '2016-12-30', to: '2017-01-01' },
    ]);
    expect(result.added).toBe(3);
  });

  it('fills in rates deleted in between', async () => {
    await fetchAll();
    await deleteFetchedRates(date =>
      ['2015-10-01', '2016-06-10', '2016-06-11', '2016-09-01'].includes(date),
    );
    const fetchFn = createFetch();

    await updateExchangeRates({ fetchFn });

    expect(getRateCalls(fetchFn)).toEqual([
      {
        base: 'CAD',
        quotes: 'USD',
        from: '2015-10-01',
        to: '2015-10-31',
        group: 'month',
      },
      { base: 'CAD', quotes: 'USD', from: '2016-06-10', to: '2016-06-11' },
      { base: 'CAD', quotes: 'USD', from: '2016-09-01', to: '2016-09-01' },
    ]);
  });

  it('remembers settled days the provider has no rate for', async () => {
    // A holiday, and a day too recent to be sure it isn't just unpublished
    await updateExchangeRates({
      fetchFn: createFetch({ skip: ['2016-06-10', '2016-12-31'] }),
    });
    const fetchFn = createFetch({ skip: ['2016-06-10'] });

    await updateExchangeRates({ fetchFn });

    expect(getRateCalls(fetchFn)).toEqual([
      { base: 'CAD', quotes: 'USD', from: '2016-12-31', to: '2016-12-31' },
    ]);
  });

  it('does not take an empty answer for days the provider has no rate for', async () => {
    await updateExchangeRates({ fetchFn: createFetch({ empty: true }) });
    const fetchFn = createFetch();

    const result = await updateExchangeRates({ fetchFn });

    expect(getRateCalls(fetchFn)).toHaveLength(2);
    expect(result.added).toBe(6 + 366);
  });

  it('forgets days the provider has no rate for once they are too old to be fetched daily', async () => {
    await prefs.savePrefs({
      exchangeRatesProviderGaps: JSON.stringify({
        USD: ['2015-12-25', '2016-06-10'],
      }),
    });

    await updateExchangeRates({ fetchFn: createFetch() });

    expect(
      JSON.parse(prefs.getPrefs()?.exchangeRatesProviderGaps ?? ''),
    ).toEqual({ USD: ['2016-06-10'] });
  });

  it.each(['USD', 'CAD'])(
    'starts at the first day the provider has rates for %s',
    async currency => {
      const fetchFn = createFetch({ starts: { [currency]: '2016-03-01' } });

      await updateExchangeRates({ fetchFn });

      expect(getRateCalls(fetchFn)).toEqual([
        { base: 'CAD', quotes: 'USD', from: '2016-03-01', to: '2017-01-01' },
      ]);
    },
  );

  it('saves nothing when another budget was opened during the update', async () => {
    const fetchFn = createFetch();
    fetchFn.mockImplementationOnce(async input => {
      prefs.unloadPrefs();
      return createFetch()(input);
    });

    const result = await updateExchangeRates({ fetchFn });

    expect(result.errors).toEqual([
      'Another budget was opened during the update',
    ]);
    expect(await getExchangeRates()).toEqual([]);
  });

  it('counts rates entered by hand as present', async () => {
    await fetchAll();
    await deleteFetchedRates(date => date === '2016-06-10');
    await insertRate('2016-06-10');
    const fetchFn = createFetch();

    await updateExchangeRates({ fetchFn });

    expect(getRateCalls(fetchFn)).toEqual([]);
  });

  it('fills in a transaction dated before the oldest rate', async () => {
    await fetchAll();
    await db.insertTransaction({
      account: 'usd',
      amount: -500,
      date: '2015-05-20',
    });
    const fetchFn = createFetch();

    await updateExchangeRates({ fetchFn });

    expect(getRateCalls(fetchFn)).toEqual([
      {
        base: 'CAD',
        quotes: 'USD',
        from: '2015-05-20',
        to: '2015-07-31',
        group: 'month',
      },
    ]);
  });

  it('fetches nothing once up to date', async () => {
    await updateExchangeRates({ fetchFn: createFetch() });
    const fetchFn = createFetch();

    const result = await updateExchangeRates({ fetchFn });

    expect(getRateCalls(fetchFn)).toEqual([]);
    expect(result.added).toBe(0);
  });

  it('starts today for a currency without transactions', async () => {
    await db.insertAccount({ id: 'cop', name: 'Nequi', currency: 'COP' });
    const fetchFn = createFetch();

    await updateExchangeRates({ fetchFn });

    expect(getRateCalls(fetchFn)).toContainEqual({
      base: 'CAD',
      quotes: 'COP',
      from: '2017-01-01',
      to: '2017-01-01',
    });
  });

  it('keeps the direction of a pair entered by the user and never replaces their rates', async () => {
    await db.insertExchangeRate({
      from_currency: 'CAD',
      to_currency: 'USD',
      rate: 0.75,
      date: db.toDateRepr('2017-01-01'),
      source: 'manual',
      created_at: 1,
    });

    await updateExchangeRates({ fetchFn: createFetch() });

    const rates = await getExchangeRates();
    expect(rates.filter(rate => rate.date === '2017-01-01')).toEqual([
      expect.objectContaining({ rate: 0.75, source: 'manual' }),
    ]);
    expect(rates.find(rate => rate.date === '2016-12-31')).toMatchObject({
      from_currency: 'CAD',
      to_currency: 'USD',
      rate: 0.7,
      source: 'frankfurter',
    });
  });

  it('keeps the direction of the first rate entered', async () => {
    await db.insertExchangeRate({
      from_currency: 'CAD',
      to_currency: 'USD',
      rate: 0.75,
      date: db.toDateRepr('2016-01-01'),
      source: 'manual',
      created_at: 1,
    });
    await db.insertExchangeRate({
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: 1.4,
      date: db.toDateRepr('2016-12-01'),
      source: 'manual',
      created_at: 2,
    });

    await updateExchangeRates({ fetchFn: createFetch() });

    const rates = await getExchangeRates();
    expect(rates.find(rate => rate.date === '2016-12-31')).toMatchObject({
      from_currency: 'CAD',
      to_currency: 'USD',
    });
  });

  it('reports currencies the provider has no rates for', async () => {
    // Supported for accounts, but not by the provider
    await db.insertAccount({ id: 'eur', name: 'Euro', currency: 'EUR' });

    const result = await updateExchangeRates({ fetchFn: createFetch() });

    expect(result.unsupported).toEqual(['EUR']);
    expect(result.added).toBeGreaterThan(0);
  });

  it('saves the other currencies when one of them fails', async () => {
    await db.insertAccount({ id: 'cop', name: 'Nequi', currency: 'COP' });

    const result = await updateExchangeRates({
      fetchFn: createFetch({ failing: ['COP'] }),
    });

    expect(result.errors).toEqual([
      expect.stringContaining('COP: Frankfurter could not answer'),
    ]);
    expect(result.added).toBeGreaterThan(0);
  });

  it('does nothing while multiple currencies are off', async () => {
    await db.update('preferences', {
      id: 'flags.multiCurrency',
      value: 'false',
    });
    loadSqlConversionState();
    const fetchFn = createFetch();

    const result = await updateExchangeRates({ fetchFn });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.errors).toHaveLength(1);
  });
});

async function insertRate(date: string, source = 'manual') {
  await db.insertExchangeRate({
    from_currency: 'USD',
    to_currency: 'CAD',
    rate: 1.4,
    date: db.toDateRepr(date),
    source,
    created_at: 1,
  });
}

async function fetchAll() {
  await updateExchangeRates({ fetchFn: createFetch() });
}

async function deleteFetchedRates(matches: (date: string) => boolean) {
  for (const rate of await getExchangeRates()) {
    if (rate.source === 'frankfurter' && matches(rate.date)) {
      await db.deleteExchangeRate({ id: rate.id });
    }
  }
}

describe('findMissingExchangeRates', () => {
  it('finds nothing when rates cover every transaction up to yesterday', async () => {
    await insertRate('2015-08-01');
    await insertRate('2016-12-31');

    expect(await findMissingExchangeRates()).toEqual([]);
  });

  it('reports rates that stop before yesterday', async () => {
    await insertRate('2015-08-01');
    await insertRate('2016-12-20');

    expect(await findMissingExchangeRates()).toEqual([
      {
        currency: 'USD',
        isOutdated: true,
        outdatedSince: '2016-12-20',
        olderTransactionsFrom: null,
        holes: null,
      },
    ]);
  });

  it('reports transactions older than the first rate', async () => {
    await insertRate('2016-01-01');
    await insertRate('2017-01-01');

    expect(await findMissingExchangeRates()).toEqual([
      {
        currency: 'USD',
        isOutdated: false,
        outdatedSince: null,
        olderTransactionsFrom: '2015-08-15',
        holes: null,
      },
    ]);
  });

  it('reports a currency without any rate', async () => {
    expect(await findMissingExchangeRates()).toEqual([
      {
        currency: 'USD',
        isOutdated: true,
        outdatedSince: null,
        olderTransactionsFrom: '2015-08-15',
        holes: null,
      },
    ]);
  });

  it('reports fetched rates missing in between', async () => {
    await fetchAll();
    await deleteFetchedRates(date =>
      ['2015-10-01', '2016-06-10', '2016-06-11'].includes(date),
    );

    expect(await findMissingExchangeRates()).toEqual([
      {
        currency: 'USD',
        isOutdated: false,
        outdatedSince: null,
        olderTransactionsFrom: null,
        holes: { startDate: '2015-10-01', endDate: '2016-06-11' },
      },
    ]);
  });

  it('does not report days before the first transaction as missing', async () => {
    // Hand-entered rates from before the first transaction, then fetched
    // ones from it on
    await insertRate('2015-01-01');
    await fetchAll();

    expect(await findMissingExchangeRates()).toEqual([]);
  });

  it('does not let a rate dated in the future hide older missing rates', async () => {
    await fetchAll();
    await deleteFetchedRates(date => date >= '2016-12-20');
    await insertRate('2017-03-01');

    expect(await findMissingExchangeRates()).toEqual([
      {
        currency: 'USD',
        isOutdated: true,
        outdatedSince: '2016-12-19',
        olderTransactionsFrom: null,
        holes: null,
      },
    ]);
  });

  it('does not report days the provider has no rate for', async () => {
    await updateExchangeRates({
      fetchFn: createFetch({ skip: ['2016-06-10'] }),
    });

    expect(await findMissingExchangeRates()).toEqual([]);
  });

  it('does not report gaps between rates entered by hand', async () => {
    await insertRate('2015-08-01');
    await insertRate('2016-06-01');
    await insertRate('2016-12-31');

    expect(await findMissingExchangeRates()).toEqual([]);
  });

  it('ignores closed accounts and does nothing while multiple currencies are off', async () => {
    await db.update('accounts', { id: 'usd', closed: 1 });
    expect(await findMissingExchangeRates()).toEqual([]);

    await db.update('accounts', { id: 'usd', closed: 0 });
    await db.update('preferences', {
      id: 'flags.multiCurrency',
      value: 'false',
    });
    loadSqlConversionState();
    expect(await findMissingExchangeRates()).toEqual([]);
  });
});

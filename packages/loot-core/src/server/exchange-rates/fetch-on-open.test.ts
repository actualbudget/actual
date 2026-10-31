import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';

import { exchangeRateId } from './app';
import { fetchTodayRates } from './fetch-on-open';
import { ensureRate, providerStatus } from './provider';

vi.mock('./provider', () => ({
  ensureRate: vi.fn(async () => ({ status: 'superseded' })),
  providerStatus: vi.fn(async () => ({
    status: 'ok',
    context: 'c',
    selected: 'fxtest',
    installed: [],
    last: null,
  })),
}));

const today = new Date().toISOString().slice(0, 10);

async function setBudget({ flags = true } = {}) {
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'USD',
      precision: 2,
    }),
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', {
      id: `flags.${flag}`,
      value: String(flags),
    });
  }
}

async function account(id: string, currency: string | null, closed = 0) {
  await db.insert('accounts', { id, name: id, currency, closed, tombstone: 0 });
}

async function fetchedToday(quote: string) {
  const timestamp = `${today}T00:00:00.000Z`;
  await db.insert('exchange_rates', {
    id: exchangeRateId('USD', quote, 'fxtest', 'fetched', timestamp),
    base_currency: 'USD',
    quote_currency: quote,
    rate: '150',
    kind: 'fetched',
    source: 'fxtest',
    timestamp,
    tombstone: 0,
  });
}

function fetched() {
  return vi.mocked(ensureRate).mock.calls.map(([options]) => options);
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await setBudget();
  vi.mocked(ensureRate).mockClear();
  vi.mocked(providerStatus).mockClear();
});

it("fetches today's rate for open account currencies without one", async () => {
  await account('usd', null);
  await account('jpy', 'JPY');
  await account('eur', 'EUR');
  await account('gbp', 'GBP', 1);
  await fetchedToday('EUR');

  await fetchTodayRates(new AbortController().signal);

  expect(providerStatus).toHaveBeenCalledTimes(1);
  expect(fetched()).toEqual([
    expect.objectContaining({
      quoteCurrency: 'JPY',
      date: today,
      forEntry: false,
    }),
  ]);
});

it('contacts no server when every rate for today is saved', async () => {
  await account('jpy', 'JPY');
  await fetchedToday('JPY');

  await fetchTodayRates(new AbortController().signal);

  expect(providerStatus).not.toHaveBeenCalled();
  expect(ensureRate).not.toHaveBeenCalled();
});

it('fetches nothing without a provider', async () => {
  await account('jpy', 'JPY');
  vi.mocked(providerStatus).mockResolvedValueOnce({
    status: 'no-server',
    context: 'c',
  });

  await fetchTodayRates(new AbortController().signal);

  expect(ensureRate).not.toHaveBeenCalled();
});

it('does nothing without multicurrency or after the budget closes', async () => {
  await account('jpy', 'JPY');
  await setBudget({ flags: false });
  await fetchTodayRates(new AbortController().signal);

  await setBudget();
  const closed = new AbortController();
  closed.abort();
  await fetchTodayRates(closed.signal);

  expect(providerStatus).not.toHaveBeenCalled();
  expect(ensureRate).not.toHaveBeenCalled();
});

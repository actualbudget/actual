import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';

import { writeFetchedRate, writeManualRate } from './app';
import { startFxContext } from './context';
import { lookupExchangeApi } from './exchange-api';
import type * as ExchangeApi from './exchange-api';
import { ensureRate, forgetMissingRates } from './provider';

vi.mock('./exchange-api', async importOriginal => ({
  ...(await importOriginal<typeof ExchangeApi>()),
  lookupExchangeApi: vi.fn(),
}));

const day = '2026-03-11';
const lookup = vi.mocked(lookupExchangeApi);

function fetchedCount() {
  return db.firstSync<{ count: number }>(
    "SELECT count(*) AS count FROM exchange_rates WHERE kind = 'fetched' AND tombstone = 0",
  )?.count;
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
  onTestFinished(startFxContext());
  forgetMissingRates();
  lookup.mockReset();
  lookup.mockResolvedValue({ status: 'ok', rate: '0.92' });
});

it('fetches directly without a sync server and caches the exact date', async () => {
  expect(await ensureRate({ quoteCurrency: 'EUR', date: day })).toMatchObject({
    status: 'inserted',
    resolution: { status: 'resolved', rate: '0.92', kind: 'fetched' },
  });
  expect(lookup).toHaveBeenCalledWith(
    { base: 'USD', quote: 'EUR', date: day },
    expect.anything(),
  );
  expect(await ensureRate({ quoteCurrency: 'EUR', date: day })).toMatchObject({
    status: 'cached',
  });
  expect(lookup).toHaveBeenCalledTimes(1);
});

it('still requests the provider rate when only a same-day manual rate exists', async () => {
  await runMutator(() =>
    writeManualRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: '0.95',
      timestamp: `${day}T00:00:00.000Z`,
    }),
  );
  expect(await ensureRate({ quoteCurrency: 'EUR', date: day })).toMatchObject({
    status: 'inserted',
    resolution: { rate: '0.92', kind: 'fetched' },
  });
  expect(fetchedCount()).toBe(1);
  expect(await ensureRate({ quoteCurrency: 'EUR', date: day })).toMatchObject({
    status: 'cached',
  });
  expect(lookup).toHaveBeenCalledTimes(1);
});

it('does not let an earlier fetched fallback suppress the exact-date request', async () => {
  await runMutator(() =>
    writeFetchedRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      providerId: 'exchange-api',
      rate: '0.9',
      effectiveDate: '2026-03-10',
    }),
  );
  await ensureRate({ quoteCurrency: 'EUR', date: day });
  expect(lookup).toHaveBeenCalledTimes(1);
});

it.each(['snapshot-not-found', 'quote-omitted'] as const)(
  'keeps the %s reason and memoizes it',
  async reason => {
    lookup.mockResolvedValue({ status: 'missing', reason });
    expect(await ensureRate({ quoteCurrency: 'EUR', date: day })).toMatchObject(
      { status: 'missing', reason },
    );
    expect(await ensureRate({ quoteCurrency: 'EUR', date: day })).toMatchObject(
      { status: 'skipped', reason: 'memo' },
    );
    forgetMissingRates();
    await ensureRate({ quoteCurrency: 'EUR', date: day });
    expect(lookup).toHaveBeenCalledTimes(2);
  },
);

it('passes a rate limit through with its retry time', async () => {
  lookup.mockResolvedValue({
    status: 'error',
    code: 'rate-limited',
    retryAt: 1234,
  });
  expect(await ensureRate({ quoteCurrency: 'EUR', date: day })).toMatchObject({
    status: 'failed',
    code: 'rate-limited',
    retryAt: 1234,
  });
  expect(fetchedCount()).toBe(0);
});

it('fetches a deleted observation again', async () => {
  await ensureRate({ quoteCurrency: 'EUR', date: day });
  db.runQuery("UPDATE exchange_rates SET tombstone = 1 WHERE kind = 'fetched'");
  lookup.mockResolvedValue({ status: 'ok', rate: '0.93' });
  expect(await ensureRate({ quoteCurrency: 'EUR', date: day })).toMatchObject({
    status: 'inserted',
    resolution: { rate: '0.93' },
  });
});

it('shares one lookup between simultaneous callers', async () => {
  const [a, b] = await Promise.all([
    ensureRate({ quoteCurrency: 'EUR', date: day }),
    ensureRate({ quoteCurrency: 'EUR', date: day }),
  ]);
  expect(lookup).toHaveBeenCalledTimes(1);
  expect([a.status, b.status].sort()).toEqual(['existing', 'inserted']);
});

it('does not remember a miss whose caller stopped before receiving it', async () => {
  lookup.mockResolvedValue({ status: 'missing', reason: 'quote-omitted' });
  const stop = new AbortController();
  // The lookup answers while the stop is clear; the stop lands while the
  // caller's rate is resolved (the only rate read on this path).
  const all = vi.spyOn(db, 'all');
  onTestFinished(() => all.mockRestore());
  const read = db.all;
  all.mockImplementationOnce(async (...args) => {
    stop.abort();
    all.mockRestore();
    return read(...args);
  });
  expect(
    await ensureRate({ quoteCurrency: 'EUR', date: day, stop: stop.signal }),
  ).toMatchObject({ status: 'stopped' });
  expect(await ensureRate({ quoteCurrency: 'EUR', date: day })).toMatchObject({
    status: 'missing',
  });
  expect(lookup).toHaveBeenCalledTimes(2);
});

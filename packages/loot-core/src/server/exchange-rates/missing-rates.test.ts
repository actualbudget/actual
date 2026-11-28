import * as connection from '#platform/server/connection';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { toDateRepr } from '#server/models';
import * as prefs from '#server/prefs';
import type { MissingRatesProgress } from '#types/models/exchange-rate-history';

import { startFxContext } from './context';
import {
  missingRatesStatus,
  onMissingRatesFinished,
  startMissingRates,
  stopAutomaticMissingRates,
  stopMissingRates,
} from './missing-rates';
import { ensureRate } from './provider';
import type { EnsureRateResult } from './provider';

vi.mock('./provider', () => ({ ensureRate: vi.fn() }));

const today = '2026-03-10';
const ensure = vi.mocked(ensureRate);
type Options = Parameters<typeof ensureRate>[0];

function reply(result: Record<string, unknown>): EnsureRateResult {
  return {
    context: 'c',
    resolution: { status: 'unavailable' },
    ...result,
  } as EnsureRateResult;
}

async function budget() {
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  await prefs.savePrefs({
    amountEncoding: '{"version":1,"currencyCode":"USD","precision":2}',
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
}
async function account(id: string, currency: string, since?: string) {
  await db.insert('accounts', {
    id,
    name: id,
    currency,
    closed: 0,
    tombstone: 0,
  });
  if (since) {
    await db.insert('transactions', {
      id: `${id}-t`,
      acct: id,
      amount: 1,
      transaction_amount: 1,
      date: toDateRepr(since),
      isParent: 0,
      tombstone: 0,
    });
  }
}
function events(): MissingRatesProgress[] {
  return vi
    .mocked(connection.send)
    .mock.calls.filter(([name]) => name === 'exchange-rates-update')
    .map(([, value]) => value as MissingRatesProgress);
}
async function settle() {
  for (let i = 0; i < 50; i++) await Promise.resolve();
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date(`${today}T12:00:00`));
  vi.stubGlobal('currentDay', today);
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await budget();
  onTestFinished(startFxContext());
  vi.mocked(connection.send).mockClear();
  ensure.mockReset();
  ensure.mockResolvedValue(reply({ status: 'inserted', effectiveDate: today }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('fills every missing day with at most four lookups at a time', async () => {
  await account('a', 'JPY', '2026-03-01');
  let active = 0;
  let peak = 0;
  ensure.mockImplementation(async () => {
    peak = Math.max(peak, ++active);
    await Promise.resolve();
    active--;
    return reply({ status: 'inserted', effectiveDate: today });
  });
  await startMissingRates({ reason: 'automatic' });
  await settle();
  expect(ensure).toHaveBeenCalledTimes(10);
  expect(peak).toBeLessThanOrEqual(4);
  expect(events().at(-1)).toMatchObject({ state: 'done', added: 10 });
  // Today comes first.
  expect(ensure.mock.calls[0][0]).toMatchObject({ date: today });
});

it('joins a running run instead of starting a second one', async () => {
  await account('a', 'JPY');
  ensure.mockImplementation(() => new Promise(() => undefined));
  const first = await startMissingRates({ reason: 'automatic' });
  const second = await startMissingRates({ reason: 'automatic' });
  expect(second).toEqual(first);
});

it('pauses while both mirrors cool down and resumes at retryAt', async () => {
  await account('a', 'JPY');
  ensure.mockResolvedValueOnce(
    reply({
      status: 'failed',
      code: 'rate-limited',
      retryAt: Date.now() + 15 * 60 * 1000,
    }),
  );
  await startMissingRates({ reason: 'automatic' });
  await settle();
  expect(events().at(-1)).toMatchObject({ state: 'paused' });
  expect(ensure).toHaveBeenCalledTimes(1);
  // Longer than the ten-minute segment: waiting does not end the run.
  await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
  await settle();
  expect(ensure).toHaveBeenCalledTimes(2);
  expect(events().at(-1)).toMatchObject({ state: 'done', added: 1 });
});

it('cancels the pause timer on Stop and reports a user stop', async () => {
  await account('a', 'JPY');
  const reasons: string[] = [];
  onTestFinished(onMissingRatesFinished(reason => reasons.push(reason)));
  ensure.mockResolvedValueOnce(
    reply({
      status: 'failed',
      code: 'rate-limited',
      retryAt: Date.now() + 60000,
    }),
  );
  const started = await startMissingRates({ reason: 'automatic' });
  await settle();
  if (!('runId' in started)) throw new Error('not started');
  await stopMissingRates({ runId: started.runId });
  await vi.advanceTimersByTimeAsync(60000);
  expect(ensure).toHaveBeenCalledTimes(1);
  expect(reasons).toEqual(['user']);
  expect((await missingRatesStatus())?.state).toBe('stopped');
});

it('stops after five consecutive failed lookups', async () => {
  await account('a', 'JPY', '2026-02-01');
  const reasons: string[] = [];
  onTestFinished(onMissingRatesFinished(reason => reasons.push(reason)));
  ensure.mockResolvedValue(reply({ status: 'failed', code: 'unavailable' }));
  await startMissingRates({ reason: 'automatic' });
  await settle();
  expect(reasons).toEqual(['failing']);
  expect(ensure.mock.calls.length).toBeLessThan(10);
  expect(events().at(-1)).toMatchObject({ state: 'stopped', errors: 5 });
});

it('settles old omitted quotes without any success and skips them next time', async () => {
  await account('a', 'JPY', '2026-03-01');
  ensure.mockImplementation(async (options: Options) =>
    reply({ status: 'missing', reason: 'quote-omitted', ...options }),
  );
  await startMissingRates({ reason: 'automatic' });
  await settle();
  const gaps = prefs.getPrefs().exchangeRateGaps ?? [];
  // Three or more days old settle; the recent ones stay retryable.
  expect(gaps.map(gap => gap.split('|')[4]).sort()).toEqual([
    '2026-03-01',
    '2026-03-02',
    '2026-03-03',
    '2026-03-04',
    '2026-03-05',
    '2026-03-06',
    '2026-03-07',
  ]);
  ensure.mockClear();
  await startMissingRates({ reason: 'automatic' });
  await settle();
  expect(ensure.mock.calls.map(([options]) => options.date).sort()).toEqual([
    '2026-03-08',
    '2026-03-09',
    '2026-03-10',
  ]);
  // Get missing rates revisits settled dates.
  ensure.mockClear();
  await startMissingRates({ reason: 'manual' });
  await settle();
  expect(ensure).toHaveBeenCalledTimes(10);
});

it('settles a missing snapshot only once later snapshots exist', async () => {
  await account('a', 'JPY', '2026-03-01');
  ensure.mockImplementation(async (options: Options) =>
    options.date === '2026-03-02'
      ? reply({ status: 'missing', reason: 'snapshot-not-found' })
      : reply({ status: 'inserted', effectiveDate: options.date }),
  );
  await startMissingRates({ reason: 'automatic' });
  await settle();
  expect(prefs.getPrefs().exchangeRateGaps).toEqual([
    'exchange-api|1.0.0|USD|JPY|2026-03-02|snapshot-not-found',
  ]);
});

it('never settles errors', async () => {
  await account('a', 'JPY', '2026-03-01');
  ensure.mockImplementation(async (options: Options) =>
    options.date === '2026-03-02'
      ? reply({ status: 'failed', code: 'unavailable' })
      : reply({ status: 'inserted', effectiveDate: options.date }),
  );
  await startMissingRates({ reason: 'automatic' });
  await settle();
  expect(prefs.getPrefs().exchangeRateGaps ?? []).toEqual([]);
});

it('lets Get missing rates replace an automatic run, joining only a manual one', async () => {
  await account('a', 'JPY');
  ensure.mockImplementation(() => new Promise(() => undefined));
  const automatic = await startMissingRates({ reason: 'automatic' });
  const manual = await startMissingRates({ reason: 'manual' });
  expect(manual).not.toEqual(automatic);
  expect(await startMissingRates({ reason: 'manual' })).toEqual(manual);
  expect(await startMissingRates({ reason: 'automatic' })).toEqual(manual);
});

it('keeps settled gaps when an automatic run is replaced', async () => {
  await account('a', 'JPY', '2026-03-01');
  // Old days settle; the rest stay in flight so the run is still open.
  ensure.mockImplementation(async (options: Options) =>
    options.date <= '2026-03-07'
      ? reply({ status: 'missing', reason: 'quote-omitted', ...options })
      : new Promise(() => undefined),
  );
  await startMissingRates({ reason: 'automatic' });
  await settle();
  stopAutomaticMissingRates();
  expect((prefs.getPrefs().exchangeRateGaps ?? []).length).toBeGreaterThan(0);
});

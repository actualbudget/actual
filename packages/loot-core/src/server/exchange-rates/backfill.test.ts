import * as connection from '#platform/server/connection';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { handlers } from '#server/main';
import { runHandler, runMutator } from '#server/mutators';
import * as mutators from '#server/mutators';
import * as prefs from '#server/prefs';
import { setServer } from '#server/server-config';
import { app as transactionsApp } from '#server/transactions/app';
import { loadRules } from '#server/transactions/transaction-rules';
import { addUtcDays, parseRate } from '#shared/exchange-rate';
import type { BackfillProgress } from '#types/models/exchange-rate-history';
import type { ServerEvents } from '#types/server-events';

import { app, writeFetchedRate, writeManualRate } from './app';
import { backfillCancel, backfillPlan, backfillStart } from './backfill';
import type { BackfillOptions } from './backfill';
import {
  captureFxContext,
  notifyFxContextChanged,
  startFxContext,
} from './context';
import { ensureRate } from './provider';
import { fxRequest } from './transport';
import type * as Transport from './transport';
import type { FxRequestResult } from './transport';

vi.mock('./transport', async importOriginal => ({
  ...(await importOriginal<typeof Transport>()),
  fxRequest: vi.fn(),
}));
const metadata = {
  id: 'fxtest',
  name: 'Test rates',
  version: '1',
  origins: ['https://rates.example.com'],
  fields: [],
};
const options = {
  quoteCurrency: 'EUR',
  from: '2026-03-09',
  to: '2026-03-15',
  policy: 'keep',
} satisfies BackfillOptions;
const held = new Map<string, (result: FxRequestResult) => void>();
let hold = false;
let failures = false;
let anyDate = false;
const calls: string[] = [];

function result(date: string): FxRequestResult {
  if (failures) {
    return { ok: true, data: { outcome: 'error', code: 'provider-error' } };
  }
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  const effectiveDate = anyDate
    ? date
    : weekday === 0
      ? addUtcDays(date, -2)
      : weekday === 6
        ? addUtcDays(date, -1)
        : date;
  return {
    ok: true,
    data: {
      outcome: 'ok',
      plugin: { id: 'fxtest', version: '1' },
      base: 'USD',
      quote: 'EUR',
      rate: anyDate
        ? '0.92'
        : parseRate(`0.${900 + Number(effectiveDate.slice(8))}`),
      effectiveDate,
    },
  };
}
function release(date: string, response = result(date)) {
  const resolve = held.get(date);
  held.delete(date);
  if (!resolve) throw new Error('test request not held');
  resolve(response);
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
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-03-20T12:00:00.000Z'));
  setServer('https://sync.example.com');
  onTestFinished(startFxContext());
  onTestFinished(() => {
    for (const date of [...held.keys()]) release(date);
    vi.useRealTimers();
  });
  hold = false;
  failures = false;
  anyDate = false;
  held.clear();
  calls.length = 0;
  vi.mocked(connection.send).mockClear();
  vi.mocked(fxRequest).mockReset();
  vi.mocked(fxRequest).mockImplementation(async (path, body) => {
    if (path === 'providers') {
      return { ok: true, data: { providers: [metadata] } };
    }
    if (typeof body.date !== 'string') {
      throw new Error('test lookup date absent');
    }
    const date = body.date;
    calls.push(date);
    if (!hold) return result(date);
    return new Promise(resolve => {
      held.set(date, resolve);
    });
  });
});
async function start(
  policy: 'keep' | 'replace' = 'keep',
  range: Partial<BackfillOptions> = {},
) {
  const input = { ...options, ...range, policy };
  const plan = await backfillPlan(input);
  if (!('context' in plan) || typeof plan.context !== 'string') {
    throw new Error(`plan failed: ${JSON.stringify(plan)}`);
  }
  const job = await backfillStart({ ...input, context: plan.context });
  if (!('jobId' in job) || typeof job.jobId !== 'string') {
    throw new Error(`start failed: ${JSON.stringify(job)}`);
  }
  onTestFinished(() => backfillCancel({ jobId: job.jobId }));
  return { jobId: job.jobId, context: plan.context };
}
function rateOn(date: string, source = 'plugin:fxtest') {
  return db.firstSync<{ rate: string; tombstone: number }>(
    'SELECT rate, tombstone FROM exchange_rates WHERE timestamp = ? AND source = ?',
    [`${date}T00:00:00.000Z`, source],
  );
}
async function done(expected: Record<string, string | number>) {
  await vi.waitFor(() =>
    expect(connection.send).toHaveBeenCalledWith(
      'fx-backfill-progress',
      expect.objectContaining(expected),
    ),
  );
}
it('plans authoritatively and fills seven days with five business-day rows', async () => {
  expect(await backfillPlan(options)).toMatchObject({
    status: 'ok',
    dates: 7,
    cached: 0,
    toFetch: 7,
  });
  const job = await start();
  await done({
    state: 'done',
    done: 7,
    inserted: 5,
    existing: 2,
    unprocessed: 0,
  });
  expect(calls).toEqual([
    '2026-03-09',
    '2026-03-10',
    '2026-03-11',
    '2026-03-12',
    '2026-03-13',
    '2026-03-14',
    '2026-03-15',
  ]);
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates WHERE tombstone = 0',
    )?.count,
  ).toBe(5);
  expect(
    ['09', '10', '11', '12', '13'].map(day => rateOn(`2026-03-${day}`)),
  ).toEqual(
    ['0.909', '0.91', '0.911', '0.912', '0.913'].map(rate => ({
      rate,
      tombstone: 0,
    })),
  );
  expect(job.jobId).not.toBe('');
});
it('counts exact cached dates and keeps a tombstoned key without reviving it', async () => {
  await runMutator(() =>
    writeFetchedRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      providerId: 'fxtest',
      effectiveDate: '2026-03-10',
      rate: '0.95',
    }),
  );
  await runMutator(() =>
    writeFetchedRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      providerId: 'fxtest',
      effectiveDate: '2026-03-12',
      rate: '0.8',
    }),
  );
  db.runQuery(
    "UPDATE exchange_rates SET tombstone = 1 WHERE timestamp = '2026-03-12T00:00:00.000Z'",
  );
  expect(await backfillPlan(options)).toMatchObject({ cached: 1, toFetch: 6 });
  await start();
  await done({ state: 'done', done: 7, cached: 1, existing: 3, inserted: 3 });
  expect(calls).toHaveLength(6);
  expect(calls).not.toContain('2026-03-10');
  expect(rateOn('2026-03-10')).toEqual({ rate: '0.95', tombstone: 0 });
  expect(
    db.firstSync<{ rate: string; tombstone: number }>(
      "SELECT rate, tombstone FROM exchange_rates WHERE timestamp = '2026-03-12T00:00:00.000Z'",
    ),
  ).toEqual({ rate: '0.8', tombstone: 1 });
});
it('starts only four requests, refills one immediately, and stops without late writes', async () => {
  hold = true;
  const job = await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  release('2026-03-09');
  await vi.waitFor(() => expect(calls).toHaveLength(5));
  expect(calls[4]).toBe('2026-03-13');
  await backfillCancel({ jobId: job.jobId });
  await done({
    state: 'stopped',
    stopReason: 'cancelled',
    done: 1,
    inserted: 1,
    unprocessed: 6,
  });
  for (const date of [...held.keys()]) release(date);
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(calls).toHaveLength(5);
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(1);
});
it('counts the triggering rate-limit result last and ignores other completions', async () => {
  hold = true;
  await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  release('2026-03-09');
  await vi.waitFor(() => expect(calls).toHaveLength(5));
  release('2026-03-10', {
    ok: true,
    data: { outcome: 'error', code: 'rate-limited' },
  });
  await done({
    state: 'stopped',
    stopReason: 'rate-limited',
    done: 2,
    inserted: 1,
    failed: 1,
    unprocessed: 5,
  });
  const stoppedEvents = events().length;
  for (const date of ['2026-03-11', '2026-03-12', '2026-03-13']) {
    release(date, {
      ok: true,
      data: { outcome: 'error', code: 'rate-limited' },
    });
  }
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(events()).toHaveLength(stoppedEvents);
  expect(calls).toHaveLength(5);
  expect(calls).not.toContain('2026-03-14');
  expect(
    await db.all<{ timestamp: string }>('SELECT timestamp FROM exchange_rates'),
  ).toEqual([{ timestamp: '2026-03-09T00:00:00.000Z' }]);
});
it('stops after five consecutive failures with no row written', async () => {
  failures = true;
  await start();
  await done({
    state: 'stopped',
    stopReason: 'provider-failing',
    done: 5,
    failed: 5,
    unprocessed: 2,
  });
  expect(calls.length).toBeLessThanOrEqual(7);
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(0);
});
it('keeps a joined non-job caller alive when the job is cancelled', async () => {
  hold = true;
  const job = await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  const other = ensureRate({
    quoteCurrency: 'EUR',
    date: '2026-03-11',
    forEntry: false,
  });
  // Local capture and resolution finish through microtasks before the held request joins.
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(calls).toHaveLength(4);
  await backfillCancel({ jobId: job.jobId });
  release('2026-03-11');
  expect(await other).toMatchObject({
    status: 'inserted',
    resolution: { rate: '0.911' },
  });
  expect(calls).toHaveLength(4);
  await done({ state: 'stopped', stopReason: 'cancelled', done: 0 });
  // The only row is the one the entry caller wrote itself.
  expect(
    await db.all<{ timestamp: string }>('SELECT timestamp FROM exchange_rates'),
  ).toEqual([{ timestamp: '2026-03-11T00:00:00.000Z' }]);
});
it('allows one job and supersedes it on context invalidation', async () => {
  hold = true;
  const job = await start();
  expect(await backfillStart({ ...options, context: job.context })).toEqual({
    status: 'error',
    code: 'busy',
  });
  await notifyFxContextChanged('budget');
  await done({
    state: 'stopped',
    stopReason: 'superseded',
    done: 0,
    unprocessed: 7,
  });
});
it.each([
  {
    input: { ...options, from: '2025-03-19', to: '2026-03-20' },
    code: 'range-too-large',
  },
  { input: { ...options, to: '2026-03-21' }, code: 'range-future' },
  {
    input: { ...options, from: '2026-03-15', to: '2026-03-09' },
    code: 'range-invalid',
  },
  { input: { ...options, quoteCurrency: 'USD' }, code: 'currency-invalid' },
])(
  'rejects invalid backfill inputs before requests: $code',
  async ({ input, code }) => {
    expect(await backfillPlan(input)).toEqual({ status: 'error', code });
    expect(fxRequest).not.toHaveBeenCalled();
  },
);
it('requires fresh provider metadata for both plan and start', async () => {
  const plan = await backfillPlan(options);
  if (!('context' in plan) || typeof plan.context !== 'string') {
    throw new Error('plan failed');
  }
  vi.mocked(fxRequest).mockResolvedValue({ ok: true, data: { providers: [] } });
  expect(await backfillStart({ ...options, context: plan.context })).toEqual({
    status: 'error',
    code: 'not-installed',
  });
  expect(calls).toEqual([]);
});
it('maps a failed status read without creating a job', async () => {
  vi.mocked(fxRequest).mockResolvedValue({ ok: false, code: 'network' });
  expect(await backfillPlan(options)).toEqual({
    status: 'error',
    code: 'status-unavailable',
    statusCode: 'network',
  });
  const captured = await captureFxContext();
  if (!captured) throw new Error('context unavailable');
  expect(
    await backfillStart({ ...options, context: captured.context }),
  ).toEqual({
    status: 'error',
    code: 'status-unavailable',
    statusCode: 'network',
  });
});

function isProgress(
  value: ServerEvents[keyof ServerEvents],
): value is BackfillProgress {
  return (
    value !== null &&
    typeof value === 'object' &&
    'jobId' in value &&
    'done' in value &&
    'unprocessed' in value
  );
}
function events() {
  return vi
    .mocked(connection.send)
    .mock.calls.filter(([name]) => name === 'fx-backfill-progress')
    .map(([, value]) => value)
    .filter(isProgress);
}
it('keeps every progress counter invariant and skips memo during a history run', async () => {
  await backfillPlan(options);
  expect(
    await ensureRate({
      quoteCurrency: 'EUR',
      date: '2026-03-14',
      forEntry: false,
    }),
  ).toMatchObject({ status: 'inserted', effectiveDate: '2026-03-13' });
  calls.length = 0;
  expect(
    await backfillPlan({ ...options, from: '2026-03-14', to: '2026-03-14' }),
  ).toMatchObject({ cached: 0, toFetch: 1 });
  await start('keep', { from: '2026-03-14', to: '2026-03-14' });
  await done({ state: 'done', done: 1, existing: 1, unprocessed: 0 });
  expect(calls).toEqual(['2026-03-14']);
  for (const event of events()) {
    expect(event.done).toBe(
      event.cached +
        event.inserted +
        event.replaced +
        event.existing +
        event.missing +
        event.failed,
    );
    expect(event.done + event.unprocessed).toBe(event.total);
  }
});

it('guards a job write queued behind an unrelated mutation', async () => {
  hold = true;
  const job = await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  let unlock: () => void = () => undefined;
  let locked = false;
  const blocker = runMutator(async () => {
    locked = true;
    await new Promise<void>(resolve => {
      unlock = resolve;
    });
  });
  onTestFinished(async () => {
    unlock();
    await blocker;
  });
  await vi.waitFor(() => expect(locked).toBe(true));
  const queued = vi.spyOn(mutators, 'runMutator');
  onTestFinished(() => {
    queued.mockRestore();
  });
  release('2026-03-09');
  await vi.waitFor(() => expect(queued).toHaveBeenCalledOnce());
  await backfillCancel({ jobId: job.jobId });
  unlock();
  await blocker;
  await done({
    state: 'stopped',
    stopReason: 'cancelled',
    done: 0,
    unprocessed: 7,
  });
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(0);
});

it('resets a failure streak when a later cached date completes first', async () => {
  await runMutator(() =>
    writeFetchedRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      providerId: 'fxtest',
      effectiveDate: '2026-03-16',
      rate: '0.916',
    }),
  );
  hold = true;
  failures = true;
  await start('keep', { to: '2026-03-16' });
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  for (let n = 0; n < 4; n++) {
    release(addUtcDays('2026-03-09', n));
    await done({ state: 'running', done: n + 1 });
  }
  await done({ state: 'running', done: 5, cached: 1, failed: 4 });
  release('2026-03-13');
  await done({ state: 'running', done: 6, failed: 5, cached: 1 });
  release('2026-03-14');
  release('2026-03-15');
  await done({ state: 'done', done: 8, failed: 7, cached: 1, unprocessed: 0 });
});

it('aborts a held job before close-budget flushes running methods', async () => {
  hold = true;
  await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  const before = performance.now();
  await runHandler(async () => ({}), undefined, { name: 'close-budget' });
  expect(performance.now() - before).toBeLessThan(1000);
  await done({
    state: 'stopped',
    stopReason: 'superseded',
    done: 0,
    unprocessed: 7,
  });
  const count = () =>
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count;
  // Two held answers arrive while the closed budget is still loaded.
  release('2026-03-09');
  release('2026-03-10');
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(count()).toBe(0);
  // The other two arrive after the next budget has opened.
  await global.emptyDatabase()();
  await loadMappings();
  release('2026-03-11');
  release('2026-03-12');
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(count()).toBe(0);
  expect(calls).toHaveLength(4);
});

it('stops at ten minutes with exactly the first 168 completions counted', async () => {
  vi.useRealTimers();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-20T12:00:00.000Z'));
  hold = true;
  anyDate = true;
  await start('keep', { from: '2025-03-20', to: '2026-03-20' });
  await vi.advanceTimersByTimeAsync(0);
  expect(calls).toHaveLength(4);
  for (let tick = 0; tick < 42; tick++) {
    await vi.advanceTimersByTimeAsync(14000);
    const outstanding = [...held.keys()];
    expect(outstanding).toHaveLength(4);
    for (const date of outstanding) release(date);
    await vi.advanceTimersByTimeAsync(0);
  }
  expect(events().at(-1)).toMatchObject({
    state: 'running',
    done: 168,
    inserted: 168,
  });
  expect(calls).toHaveLength(172);
  await vi.advanceTimersByTimeAsync(12000);
  expect(events().at(-1)).toMatchObject({
    state: 'stopped',
    stopReason: 'deadline',
    done: 168,
    inserted: 168,
    unprocessed: 198,
  });
  for (const date of [...held.keys()]) release(date);
  await vi.advanceTimersByTimeAsync(0);
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(168);
  for (const event of events()) {
    expect(event.done + event.unprocessed).toBe(event.total);
    expect(event.done).toBe(
      event.cached +
        event.inserted +
        event.replaced +
        event.existing +
        event.missing +
        event.failed,
    );
  }
});

it('explicit refresh replaces and revives only the selected fetched keys, then reports all unchanged outcomes', async () => {
  await runMutator(() =>
    writeManualRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: '0.88',
      kind: 'standing',
      timestamp: '2026-03-09T00:00:00.000Z',
    }),
  );
  for (const [effectiveDate, rate] of [
    ['2026-03-10', '0.95'],
    ['2026-03-12', '0.8'],
  ]) {
    await runMutator(() =>
      writeFetchedRate({
        baseCurrency: 'USD',
        quoteCurrency: 'EUR',
        providerId: 'fxtest',
        effectiveDate,
        rate,
      }),
    );
  }
  db.runQuery(
    "UPDATE exchange_rates SET tombstone = 1 WHERE timestamp = '2026-03-12T00:00:00.000Z'",
  );
  expect(await backfillPlan({ ...options, policy: 'replace' })).toMatchObject({
    cached: 0,
    toFetch: 7,
  });
  await start('replace');
  await done({ state: 'done', done: 7, replaced: 2, inserted: 3, existing: 2 });
  expect(calls).toHaveLength(7);
  expect(
    db.firstSync<{ rate: string }>(
      "SELECT rate FROM exchange_rates WHERE source = 'manual'",
    )?.rate,
  ).toBe('0.88');
  expect(rateOn('2026-03-09')).toEqual({ rate: '0.909', tombstone: 0 });
  expect(rateOn('2026-03-10')).toEqual({ rate: '0.91', tombstone: 0 });
  expect(
    db.firstSync<{ rate: string; tombstone: number }>(
      "SELECT rate, tombstone FROM exchange_rates WHERE timestamp = '2026-03-12T00:00:00.000Z'",
    ),
  ).toEqual({ rate: '0.912', tombstone: 0 });
  calls.length = 0;
  const writes = [vi.spyOn(db, 'insert'), vi.spyOn(db, 'update')];
  onTestFinished(() => writes.forEach(spy => spy.mockRestore()));
  await start('replace');
  await done({ state: 'done', done: 7, replaced: 0, inserted: 0, existing: 7 });
  expect(calls).toHaveLength(7);
  for (const spy of writes) expect(spy).not.toHaveBeenCalled();
});

it('a second keep run requests only the two non-exact weekend dates', async () => {
  await start();
  await done({ state: 'done', done: 7 });
  calls.length = 0;
  await start();
  await done({ state: 'done', done: 7, cached: 5, existing: 2, inserted: 0 });
  expect(calls).toEqual(['2026-03-14', '2026-03-15']);
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(5);
});

it('reports no server, no binding and defensive unconfigured metadata without creating a job', async () => {
  vi.mocked(fxRequest).mockResolvedValue({ ok: true, data: { providers: [] } });
  expect(await backfillPlan(options)).toEqual({
    status: 'error',
    code: 'no-provider',
  });
  setServer(null);
  expect(await backfillPlan(options)).toEqual({
    status: 'error',
    code: 'no-server',
  });
  setServer('https://sync.example.com');
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: {
      providers: [
        {
          ...metadata,
          fields: [
            {
              key: 'apiKey',
              label: 'API key',
              required: true,
              secret: true,
              configured: false,
            },
          ],
        },
      ],
    },
  });
  expect(await backfillPlan(options)).toEqual({
    status: 'error',
    code: 'not-configured',
  });
  expect(calls).toEqual([]);
});

it('a changed identity in a held lookup supersedes the job before counting or writing it', async () => {
  hold = true;
  await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  release('2026-03-09', {
    ok: true,
    data: {
      outcome: 'ok',
      plugin: { id: 'fxtest', version: '2' },
      base: 'USD',
      quote: 'EUR',
      rate: '0.909',
      effectiveDate: '2026-03-09',
    },
  });
  await done({
    state: 'stopped',
    stopReason: 'superseded',
    done: 0,
    unprocessed: 7,
  });
  expect(calls).toHaveLength(4);
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(0);
});

it('keeps hostile transport exceptions out of progress and public start replies', async () => {
  const original = vi.mocked(fxRequest).getMockImplementation();
  if (!original) throw new Error('test transport missing');
  vi.mocked(fxRequest).mockImplementation((path, body, options) =>
    path === 'lookup'
      ? Promise.reject(
          new Error('401 https://rates.invalid/x?app_id=SECRET123'),
        )
      : original(path, body, options),
  );
  const job = await start();
  await done({
    state: 'stopped',
    stopReason: 'provider-failing',
    done: 5,
    failed: 5,
  });
  expect(JSON.stringify({ job, events: events() })).not.toContain('SECRET123');
});

async function expectSupersededWithoutLateWork() {
  await done({
    state: 'stopped',
    stopReason: 'superseded',
    done: 0,
    unprocessed: 7,
  });
  const stoppedEvents = events().length;
  for (const date of [...held.keys()]) release(date);
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(calls).toHaveLength(4);
  expect(events()).toHaveLength(stoppedEvents);
  expect(
    db.firstSync<{ count: number }>(
      "SELECT count(*) AS count FROM exchange_rates WHERE source != 'manual'",
    )?.count,
  ).toBe(0);
}

it('a status read with changed provider metadata supersedes a held job', async () => {
  hold = true;
  await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  const original = vi.mocked(fxRequest).getMockImplementation();
  if (!original) throw new Error('test transport missing');
  vi.mocked(fxRequest).mockImplementation((path, body, transport) =>
    path === 'providers'
      ? Promise.resolve({
          ok: true,
          data: { providers: [{ ...metadata, name: 'Renamed rates' }] },
        })
      : original(path, body, transport),
  );
  expect(
    await runHandler(
      app.handlers['exchange-rates/provider-status'],
      undefined,
      {
        name: 'exchange-rates/provider-status',
      },
    ),
  ).toMatchObject({ status: 'ok', selected: 'fxtest' });
  await expectSupersededWithoutLateWork();
});

it('the exported provider notification supersedes a held job', async () => {
  hold = true;
  await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  await notifyFxContextChanged('provider');
  await expectSupersededWithoutLateWork();
});

it('set-server-url supersedes a held job and late answers write nothing', async () => {
  hold = true;
  await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  expect(
    await runHandler(
      handlers['set-server-url'],
      { url: 'https://other.example.com', validate: false },
      { name: 'set-server-url' },
    ),
  ).toEqual({});
  await expectSupersededWithoutLateWork();
});

it('a manual rate save and a foreign entry both finish while job requests are held', async () => {
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
  await loadRules();
  await db.insertAccount({ id: 'eur', name: 'Euro', currency: 'EUR' });
  await db.insertPayee({ name: '', transfer_acct: 'eur' });
  hold = true;
  await start();
  await vi.waitFor(() => expect(calls).toHaveLength(4));
  // runHandler queues both mutating handlers behind any held mutation.
  expect(mutators.isMutating(app.handlers['exchange-rates/save'])).toBe(true);
  expect(
    mutators.isMutating(
      transactionsApp.handlers['transactions/post-foreign-entry'],
    ),
  ).toBe(true);
  await runHandler(
    app.handlers['exchange-rates/save'],
    {
      quoteCurrency: 'EUR',
      rate: '0.88',
      kind: 'standing',
      date: '2026-03-01',
    },
    { name: 'exchange-rates/save' },
  );
  const posted = await runHandler(
    transactionsApp.handlers['transactions/post-foreign-entry'],
    {
      transaction: {
        id: 'b16-entry',
        account: 'eur',
        date: '2026-03-10',
        transaction_amount: -880,
      },
    },
    { name: 'transactions/post-foreign-entry' },
  );
  if (posted.status !== 'ok') throw new Error(JSON.stringify(posted));
  expect(
    db.firstSync<{ amount: number; transaction_amount: number }>(
      'SELECT amount, transaction_amount FROM transactions WHERE id = ?',
      [posted.id],
    ),
  ).toEqual({ amount: -1000, transaction_amount: -880 });
  // Both writes completed with all four job requests still held.
  expect(held.size).toBe(4);
  expect(calls).toHaveLength(4);
  expect(events().at(-1)).toMatchObject({ state: 'running', done: 0 });
  hold = false;
  for (const date of [...held.keys()]) release(date);
  await done({ state: 'done', done: 7, inserted: 5, existing: 2 });
});

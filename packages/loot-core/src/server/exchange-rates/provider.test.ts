import * as storage from '#platform/server/asyncStorage';
import * as memoryStorage from '#platform/server/asyncStorage/__mocks__/index';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';
import { setServer } from '#server/server-config';

import { writeManualRate } from './app';
import {
  captureFxContext,
  createFxController,
  startFxContext,
} from './context';
import { ensureRate, providerStatus } from './provider';
import { fxRequest } from './transport';
import type * as Transport from './transport';
import type { JsonObject, JsonValue } from './transport';

vi.mock('./transport', async importOriginal => ({
  ...(await importOriginal<typeof Transport>()),
  fxRequest: vi.fn(),
}));

const metadata = {
  id: 'fxtest',
  name: 'Test rates',
  version: '1',
  origins: ['https://rates.example.com'],
  fields: [] satisfies JsonValue[],
};

beforeEach(async () => {
  vi.mocked(storage.getItem).mockImplementation(memoryStorage.getItem);
  vi.mocked(storage.setItem).mockImplementation(memoryStorage.setItem);
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
  setServer('https://sync.example.com');
  await storage.setItem('user-token', 'TOKEN_SECRET');
  onTestFinished(startFxContext());
  vi.mocked(fxRequest).mockReset();
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: { providers: [metadata] },
  });
});

it('discovers the single provider and returns its new current context', async () => {
  const before = await captureFxContext();
  const result = await providerStatus();
  expect(result).toMatchObject({
    status: 'ok',
    selected: 'fxtest',
    installed: [metadata],
    last: null,
  });
  expect(result).toHaveProperty('context', (await captureFxContext())?.context);
  expect(result).not.toHaveProperty('context', before?.context);
  expect(JSON.stringify(result)).not.toContain('TOKEN_SECRET');
  const again = await providerStatus();
  expect(again).toHaveProperty('context', (await captureFxContext())?.context);
  expect(again).toHaveProperty(
    'context',
    'context' in result ? result.context : 'missing',
  );
});

it('reports the empty production binding without inventing a selection', async () => {
  vi.mocked(fxRequest).mockResolvedValue({ ok: true, data: { providers: [] } });
  expect(await providerStatus()).toMatchObject({
    status: 'ok',
    selected: null,
    installed: [],
  });
});

it('does not make a request without a server', async () => {
  setServer(null);
  expect(await providerStatus()).toMatchObject({ status: 'no-server' });
  expect(fxRequest).not.toHaveBeenCalled();
});

const malformedMetadata: JsonValue[] = [
  null,
  [metadata, metadata],
  [{ ...metadata, id: 'bad/id' }],
  [{ ...metadata, origins: ['http://rates.example.com'] }],
  [{ ...metadata, id: 'x'.repeat(41) }],
  [{ ...metadata, name: 'x'.repeat(65) }],
  [{ ...metadata, version: 'x'.repeat(33) }],
  [
    {
      ...metadata,
      fields: [
        {
          key: 'apiKey',
          label: 'API key',
          secret: true,
          required: true,
          configured: true,
          value: 'SECRET_VALUE',
        },
      ],
    },
  ],
];
it.each(malformedMetadata.map(providers => ({ providers })))(
  'rejects malformed or secret-bearing metadata: %j',
  async ({ providers }) => {
    vi.mocked(fxRequest).mockResolvedValue({ ok: true, data: { providers } });
    expect(await providerStatus()).toMatchObject({
      status: 'unavailable',
      code: 'server-error',
    });
  },
);

it('supersedes a late metadata reply from a different session', async () => {
  let release: () => void = () => undefined;
  vi.mocked(fxRequest).mockImplementation(
    () =>
      new Promise(resolve => {
        release = () => resolve({ ok: true, data: { providers: [metadata] } });
      }),
  );
  const pending = providerStatus();
  await vi.waitFor(() => expect(fxRequest).toHaveBeenCalledOnce());
  setServer('https://other.example.com');
  release();
  expect(await pending).toEqual({ status: 'superseded' });
  expect((await captureFxContext())?.providerId).toBeNull();
});

it('cancels captured work when any provider metadata changes', async () => {
  await providerStatus();
  const captured = await captureFxContext();
  if (!captured) throw new Error('test context unavailable');
  const controller = createFxController(captured);
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: { providers: [{ ...metadata, name: 'Renamed rates' }] },
  });
  expect(await providerStatus()).toMatchObject({
    status: 'ok',
    installed: [{ ...metadata, name: 'Renamed rates' }],
  });
  expect(controller.signal.aborted).toBe(true);
});

it('projects transport errors to fixed public codes', async () => {
  vi.mocked(fxRequest).mockResolvedValue({
    ok: false,
    code: 'invalid-config-value',
  });
  expect(await providerStatus()).toMatchObject({
    status: 'unavailable',
    code: 'server-error',
  });
  vi.mocked(fxRequest).mockResolvedValue({ ok: false, code: 'token-expired' });
  expect(await providerStatus()).toMatchObject({
    status: 'unavailable',
    code: 'token-expired',
  });
});

it('accepts the approved provider id and HTTPS documentation URL domain', async () => {
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: {
      providers: [
        {
          ...metadata,
          id: '1rates',
          origins: ['https://rates.example.com/docs'],
        },
      ],
    },
  });
  expect(await providerStatus()).toMatchObject({
    status: 'ok',
    selected: '1rates',
  });
});

const lookup = { quoteCurrency: 'EUR', date: '2026-03-11', forEntry: false };
async function ready() {
  await providerStatus();
  vi.mocked(fxRequest).mockClear();
}
function answer(effectiveDate = lookup.date) {
  return {
    outcome: 'ok',
    plugin: { id: 'fxtest', version: '1' },
    base: 'USD',
    quote: 'EUR',
    rate: '0.92',
    effectiveDate,
  };
}
function heldLookup() {
  let release: () => void = () => undefined;
  vi.mocked(fxRequest).mockImplementation(
    () =>
      new Promise(resolve => {
        release = () => resolve({ ok: true, data: answer() });
      }),
  );
  return () => release();
}

it('joins a shared request while each caller re-resolves its own local priority', async () => {
  await ready();
  const release = heldLookup();
  const entry = ensureRate({ ...lookup, forEntry: true });
  const valuation = ensureRate(lookup);
  await vi.waitFor(() => expect(fxRequest).toHaveBeenCalledOnce());
  await runMutator(() =>
    writeManualRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: '0.95',
      kind: 'dated',
      timestamp: '2026-03-11T00:00:00.000Z',
    }),
  );
  release();
  const outcomes = await Promise.all([entry, valuation]);
  expect(outcomes.map(value => value.status).sort()).toEqual([
    'existing',
    'inserted',
  ]);
  expect(outcomes[0]).toMatchObject({
    resolution: { rate: '0.95', kind: 'dated' },
  });
  expect(outcomes[1]).toMatchObject({
    resolution: { rate: '0.92', kind: 'fetched' },
  });
  expect(fxRequest).toHaveBeenCalledOnce();
});

it('returns exact fetched cache and refreshes only with explicit authority', async () => {
  await ready();
  vi.mocked(fxRequest).mockResolvedValue({ ok: true, data: answer() });
  expect(await ensureRate(lookup)).toMatchObject({ status: 'inserted' });
  expect(await ensureRate(lookup)).toMatchObject({ status: 'cached' });
  expect(fxRequest).toHaveBeenCalledOnce();
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: { ...answer(), rate: '0.94' },
  });
  expect(await ensureRate({ ...lookup, refresh: true })).toMatchObject({
    status: 'replaced',
    resolution: { rate: '0.94' },
  });
  expect(fxRequest).toHaveBeenCalledTimes(2);
});

it('memoizes earlier effective days but skipMemo fetches the requested day again', async () => {
  await ready();
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: answer('2026-03-10'),
  });
  expect(await ensureRate(lookup)).toMatchObject({
    status: 'inserted',
    fallback: true,
  });
  expect(await ensureRate(lookup)).toMatchObject({
    status: 'skipped',
    reason: 'memo',
  });
  expect(await ensureRate({ ...lookup, skipMemo: true })).toMatchObject({
    status: 'existing',
  });
  expect(fxRequest).toHaveBeenCalledTimes(2);
});

it('stops one caller without cancelling the joined caller or shared fetch', async () => {
  await ready();
  const release = heldLookup();
  const stop = new AbortController();
  const job = ensureRate({ ...lookup, stop: stop.signal });
  const other = ensureRate(lookup);
  await vi.waitFor(() => expect(fxRequest).toHaveBeenCalledOnce());
  stop.abort();
  expect(await job).toMatchObject({ status: 'stopped' });
  expect(vi.mocked(fxRequest).mock.calls[0][2].lifecycle.aborted).toBe(false);
  release();
  expect(await other).toMatchObject({ status: 'inserted' });
});

it('does not write after a caller stops while its short write is queued', async () => {
  await ready();
  const stop = new AbortController();
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
  vi.mocked(fxRequest).mockResolvedValue({ ok: true, data: answer() });
  const pending = ensureRate({ ...lookup, stop: stop.signal });
  await vi.waitFor(() => expect(fxRequest).toHaveBeenCalledOnce());
  stop.abort();
  unlock();
  await blocker;
  expect(await pending).toMatchObject({ status: 'stopped' });
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(0);
});

it.each<{
  value: JsonObject;
  expected: { status: string; reason?: string; code?: string };
}>([
  {
    value: { ...answer(), effectiveDate: '2026-03-03' },
    expected: { status: 'missing', reason: 'stale' },
  },
  {
    value: { ...answer(), effectiveDate: '2026-03-12' },
    expected: { status: 'failed', code: 'malformed' },
  },
  {
    value: { ...answer(), rate: '0.920' },
    expected: { status: 'failed', code: 'malformed' },
  },
  {
    value: { ...answer(), quote: 'JPY' },
    expected: { status: 'failed', code: 'malformed' },
  },
  {
    value: { outcome: 'error', code: 'auth', reason: 'SECRET_REASON' },
    expected: { status: 'failed', code: 'auth' },
  },
])(
  'validates provider output and never writes an invalid row: %j',
  async ({ value, expected }) => {
    await ready();
    vi.mocked(fxRequest).mockResolvedValue({ ok: true, data: value });
    const result = await ensureRate(lookup);
    expect(result).toMatchObject(expected);
    expect(JSON.stringify(result)).not.toContain('SECRET_REASON');
    expect(
      db.firstSync<{ count: number }>(
        'SELECT count(*) AS count FROM exchange_rates',
      )?.count,
    ).toBe(0);
  },
);

it('supersedes an ignored late reply and cannot reuse it in the new session', async () => {
  await ready();
  const release = heldLookup();
  const pending = ensureRate(lookup);
  await vi.waitFor(() => expect(fxRequest).toHaveBeenCalledOnce());
  setServer('https://new.example.com');
  release();
  expect(await pending).toMatchObject({ status: 'superseded' });
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(0);
});

it('supersedes the context when a lookup reports a changed provider identity', async () => {
  await ready();
  const before = await captureFxContext();
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: { ...answer(), plugin: { id: 'fxtest', version: '2' } },
  });
  expect(await ensureRate(lookup)).toMatchObject({ status: 'superseded' });
  expect((await captureFxContext())?.context).not.toBe(before?.context);
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(0);
});

it('rechecks caller authority after the fetched-row read yields', async () => {
  await ready();
  vi.mocked(fxRequest).mockResolvedValue({ ok: true, data: answer() });
  const stop = new AbortController();
  const original = db.first;
  let entered = false;
  let release: () => void = () => undefined;
  const held = new Promise<void>(resolve => {
    release = resolve;
  });
  const intercepted: typeof db.first = async <T>(
    sql: string,
    params?: Parameters<typeof db.first>[1],
  ) => {
    if (sql === 'SELECT * FROM exchange_rates WHERE id = ?') {
      entered = true;
      await held;
    }
    return original<T>(sql, params);
  };
  const spy = vi.spyOn(db, 'first').mockImplementation(intercepted);
  onTestFinished(() => {
    release();
    spy.mockRestore();
  });
  const pending = ensureRate({ ...lookup, stop: stop.signal });
  await vi.waitFor(() => expect(entered).toBe(true));
  stop.abort();
  release();
  expect(await pending).toMatchObject({ status: 'stopped' });
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(0);
});

it('memoizes not-installed and missing answers, expires them at one hour, and never memoizes failures', async () => {
  await ready();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  onTestFinished(() => {
    clock.mockRestore();
  });
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: { outcome: 'error', code: 'not-installed' },
  });
  expect(await ensureRate(lookup)).toMatchObject({
    status: 'skipped',
    reason: 'not-installed',
  });
  expect(await ensureRate(lookup)).toMatchObject({
    status: 'skipped',
    reason: 'not-installed',
  });
  expect(fxRequest).toHaveBeenCalledOnce();
  clock.mockReturnValue(3601000);
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: { outcome: 'missing', plugin: { id: 'fxtest', version: '1' } },
  });
  expect(await ensureRate(lookup)).toMatchObject({
    status: 'missing',
    reason: 'provider',
  });
  expect(await ensureRate(lookup)).toMatchObject({
    status: 'skipped',
    reason: 'memo',
  });
  expect(fxRequest).toHaveBeenCalledTimes(2);
  const other = { ...lookup, date: '2026-03-12' };
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: { outcome: 'error', code: 'auth' },
  });
  expect(await ensureRate(other)).toMatchObject({
    status: 'failed',
    code: 'auth',
  });
  expect(await ensureRate(other)).toMatchObject({
    status: 'failed',
    code: 'auth',
  });
  expect(fxRequest).toHaveBeenCalledTimes(4);
});

it('accepts seven fallback days across the year and rejects the eighth without rewriting the stored rate', async () => {
  await ready();
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: { ...answer('2026-12-31'), rate: '2.5' },
  });
  expect(await ensureRate({ ...lookup, date: '2027-01-07' })).toMatchObject({
    status: 'inserted',
    fallback: true,
  });
  expect(await ensureRate({ ...lookup, date: '2027-01-08' })).toMatchObject({
    status: 'missing',
    reason: 'stale',
    resolution: { status: 'unavailable' },
  });
  expect(
    db.firstSync<{ rate: string }>('SELECT rate FROM exchange_rates')?.rate,
  ).toBe('2.5');
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(1);
});

it('keeps refresh and ordinary requests in separate join groups', async () => {
  await ready();
  const releases: Array<() => void> = [];
  vi.mocked(fxRequest).mockImplementation(
    () =>
      new Promise(resolve => {
        releases.push(() => resolve({ ok: true, data: answer() }));
      }),
  );
  const ordinary = ensureRate(lookup);
  const refresh = ensureRate({ ...lookup, refresh: true });
  await vi.waitFor(() => expect(fxRequest).toHaveBeenCalledTimes(2));
  for (const release of releases) release();
  expect(
    (await Promise.all([ordinary, refresh]))
      .map(result => result.status)
      .sort(),
  ).toEqual(['existing', 'inserted']);
});

it('stores the exact inverse in a JPY budget and converts 10000 USD minor units to 15000 JPY', async () => {
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'JPY' });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'JPY',
      precision: 0,
    }),
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
  await ready();
  vi.mocked(fxRequest).mockResolvedValue({
    ok: true,
    data: { ...answer(), base: 'JPY', quote: 'USD', rate: '0.006666666666667' },
  });
  expect(
    await ensureRate({
      quoteCurrency: 'USD',
      date: lookup.date,
      forEntry: false,
    }),
  ).toMatchObject({
    status: 'inserted',
    resolution: { rate: '0.006666666666667' },
  });
  const { app } = await import('./app');
  expect(
    await app.handlers['exchange-rates/capture-entry']({
      quoteCurrency: 'USD',
      nativePrecision: 2,
      date: lookup.date,
      nativeAmount: 10000,
    }),
  ).toMatchObject({ status: 'ok', baseAmount: 15000 });
});

const exchangeApiMetadata = {
  id: 'fawazahmed0-exchange-api',
  name: 'fawazahmed0 exchange-api (market data)',
  version: '1.0.0',
  origins: ['https://cdn.jsdelivr.net', 'https://currency-api.pages.dev'],
  fields: [] satisfies JsonValue[],
};

it.each([
  {
    id: 'C1',
    base: 'USD',
    precision: 2,
    quote: 'JPY',
    nativePrecision: 0,
    rate: '158.02740002',
    amounts: [[15000, 9492]],
  },
  {
    id: 'C2',
    base: 'JPY',
    precision: 0,
    quote: 'USD',
    nativePrecision: 2,
    rate: '0.006328016533041',
    amounts: [
      [10000, 15803],
      [1000000000, 1580274000],
    ],
  },
  {
    id: 'C2x',
    base: 'JPY',
    precision: 0,
    quote: 'USD',
    nativePrecision: 2,
    rate: '0.0063280165',
    amounts: [[1000000000, 1580274008]],
  },
  {
    id: 'C3',
    base: 'USD',
    precision: 2,
    quote: 'KWD',
    nativePrecision: 3,
    rate: '0.310849125948055',
    amounts: [
      [1000, 322],
      [1000000000, 321699473],
    ],
  },
  {
    id: 'C3x',
    base: 'USD',
    precision: 2,
    quote: 'KWD',
    nativePrecision: 3,
    rate: '0.31084913',
    amounts: [[1000000000, 321699469]],
  },
  {
    id: 'C4',
    base: 'KWD',
    precision: 3,
    quote: 'USD',
    nativePrecision: 2,
    rate: '3.21699473',
    amounts: [[10000, 31085]],
  },
  {
    id: 'C5',
    base: 'USD',
    precision: 2,
    quote: 'IQD',
    nativePrecision: 0,
    rate: '1515.96887131',
    amounts: [[1000000, 65964]],
  },
  {
    id: 'C6',
    base: 'IRR',
    precision: 0,
    quote: 'KWD',
    nativePrecision: 3,
    rate: '0.000000173119011',
    amounts: [[1000, 5776373]],
  },
])(
  '$id captures the literal provider rate through the real coordinator',
  async row => {
    await db.update('preferences', {
      id: 'defaultCurrencyCode',
      value: row.base,
    });
    await prefs.savePrefs({
      amountEncoding: JSON.stringify({
        version: 1,
        currencyCode: row.base,
        precision: row.precision,
      }),
    });
    for (const flag of ['currency', 'multicurrency']) {
      await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
    }
    vi.mocked(fxRequest).mockResolvedValue({
      ok: true,
      data: { providers: [exchangeApiMetadata] },
    });
    await ready();
    const date = '2026-10-17';
    vi.mocked(fxRequest).mockResolvedValue({
      ok: true,
      data: {
        outcome: 'ok',
        plugin: {
          id: exchangeApiMetadata.id,
          version: exchangeApiMetadata.version,
        },
        base: row.base,
        quote: row.quote,
        rate: row.rate,
        effectiveDate: date,
      },
    });
    expect(
      await ensureRate({ quoteCurrency: row.quote, date, forEntry: false }),
    ).toMatchObject({
      status: 'inserted',
      resolution: { rate: row.rate },
    });
    const { app } = await import('./app');
    for (const [nativeAmount, baseAmount] of row.amounts) {
      expect(
        await app.handlers['exchange-rates/capture-entry']({
          quoteCurrency: row.quote,
          nativePrecision: row.nativePrecision,
          date,
          nativeAmount,
        }),
      ).toMatchObject({ status: 'ok', baseAmount });
    }
  },
);

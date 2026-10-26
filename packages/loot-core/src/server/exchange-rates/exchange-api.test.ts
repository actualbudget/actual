import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  lookupExchangeApi,
  parseDecimal,
  resetExchangeApiState,
  retryAfterAt,
  roundDiv,
} from './exchange-api';

// The platform module captures fetch at load; read the stubbed global per call.
vi.mock('#platform/server/fetch', () => ({
  fetchQuiet: (input: RequestInfo | URL, init?: RequestInit) =>
    globalThis.fetch(input, init),
}));

const day = '2026-10-17';
const j = (code: string, date = day) =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${code}.json`;
const c = (code: string, date = day) =>
  `https://${date}.currency-api.pages.dev/v1/currencies/${code}.json`;
const file = (code: string, rates: string, date = day) =>
  `{"date":"${date}","${code}":{${rates}}}`;
const usd = file('usd', '"jpy":158.02740002');
const jpy = file('jpy', '"usd":0.0063280165');

const json = (body: string, status = 200, headers?: HeadersInit) =>
  new Response(body, { status, headers });
const notFound = () => json('missing', 404);
const limited = (headers?: HeadersInit) => json('slow down', 429, headers);

type Reply = Response | Error | ((signal: AbortSignal) => Promise<Response>);

/** Answers each URL from its queue in order; anything unplanned fails the test. */
function route(routes: Array<[string, Reply]>) {
  const urls: string[] = [];
  const inits: RequestInit[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const key = String(url);
    urls.push(key);
    inits.push(init ?? {});
    const index = routes.findIndex(([match]) => match === key);
    if (index < 0) throw new Error(`Unexpected GET ${key}`);
    const [[, reply]] = routes.splice(index, 1);
    if (reply instanceof Error) throw reply;
    return typeof reply === 'function'
      ? reply(init?.signal ?? new AbortController().signal)
      : reply;
  });
  vi.stubGlobal('fetch', fetcher);
  return { urls, inits };
}

function lookup(input = { base: 'USD', quote: 'JPY', date: day }) {
  return lookupExchangeApi(input, { signal: new AbortController().signal });
}

beforeEach(() => {
  resetExchangeApiState();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-17T12:00:00'));
  vi.stubGlobal('currentDay', day);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('exchange-api direct lookup', () => {
  it('reads the primary mirror with a plain credential-free GET', async () => {
    const { urls, inits } = route([[j('usd'), json(usd)]]);
    expect(await lookup()).toEqual({ status: 'ok', rate: '158.02740002' });
    expect(urls).toEqual([j('usd')]);
    expect(inits[0]).toMatchObject({
      redirect: 'error',
      credentials: 'omit',
      headers: { accept: 'application/json' },
    });
    expect(JSON.stringify(inits[0].headers)).not.toMatch(/token/i);
  });

  it('falls back to the second mirror after a primary failure', async () => {
    route([
      [j('usd'), json('x', 500)],
      [c('usd'), json(usd)],
    ]);
    expect(await lookup()).toEqual({ status: 'ok', rate: '158.02740002' });
  });

  it('reports snapshot-not-found only when both mirrors return 404', async () => {
    route([
      [j('usd'), notFound()],
      [c('usd'), notFound()],
    ]);
    expect(await lookup()).toEqual({
      status: 'missing',
      reason: 'snapshot-not-found',
    });
    route([
      [j('usd'), notFound()],
      [c('usd'), json('x', 500)],
    ]);
    expect(await lookup()).toEqual({ status: 'error', code: 'unavailable' });
  });

  it('reports quote-omitted for a valid dated snapshot without the quote', async () => {
    route([[j('usd'), json(file('usd', '"eur":0.9'))]]);
    expect(await lookup()).toEqual({
      status: 'missing',
      reason: 'quote-omitted',
    });
  });

  it.each([
    ['a nonnumeric quote', file('usd', '"jpy":"158"')],
    ['a zero quote', file('usd', '"jpy":0')],
    ['a wrongly dated snapshot', file('usd', '"jpy":158', '2026-10-16')],
    ['malformed JSON', '{"date":'],
  ])('treats %s as a non-settling error', async (_name, body) => {
    route([
      [j('usd'), json(body)],
      [c('usd'), json(body)],
    ]);
    expect(await lookup()).toEqual({ status: 'error', code: 'unavailable' });
  });

  it('refuses a future date without any request', async () => {
    const { urls } = route([]);
    expect(
      await lookup({ base: 'USD', quote: 'JPY', date: '2026-10-18' }),
    ).toEqual({ status: 'error', code: 'unavailable' });
    expect(urls).toEqual([]);
  });

  it('keeps precision for tiny rates through the reciprocal snapshot', async () => {
    route([
      [j('jpy'), json(jpy)],
      [j('usd'), json(usd)],
    ]);
    expect(await lookup({ base: 'JPY', quote: 'USD', date: day })).toEqual({
      status: 'ok',
      rate: '0.006328016533041',
    });
  });

  it('rejects oversized bodies', async () => {
    const big = file('usd', `"jpy":158,"pad":"${'x'.repeat(262144)}"`);
    route([
      [j('usd'), json(big)],
      [c('usd'), json(big)],
    ]);
    expect(await lookup()).toEqual({ status: 'error', code: 'unavailable' });
  });

  it('times out a held mirror and tries the other one', async () => {
    const held = (signal: AbortSignal) =>
      new Promise<Response>((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new Error('aborted'))),
      );
    route([
      [j('usd'), held],
      [c('usd'), json(usd)],
    ]);
    const result = lookup();
    await vi.advanceTimersByTimeAsync(3500);
    expect(await result).toEqual({ status: 'ok', rate: '158.02740002' });
  });

  it('shares one read of a snapshot between simultaneous lookups', async () => {
    const { urls } = route([
      [j('usd'), json(file('usd', '"jpy":158,"eur":2'))],
    ]);
    const [a, b] = await Promise.all([
      lookup(),
      lookup({ base: 'USD', quote: 'EUR', date: day }),
    ]);
    expect(a).toEqual({ status: 'ok', rate: '158' });
    expect(b).toEqual({ status: 'ok', rate: '2' });
    expect(urls).toEqual([j('usd')]);
  });
});

describe('mirror rate limits', () => {
  it('uses the other mirror on 429 and keeps the cooldown after it succeeds', async () => {
    const { urls } = route([
      [j('usd'), limited({ 'retry-after': '120' })],
      [c('usd'), json(usd)],
      [c('usd', '2026-10-16'), json(file('usd', '"jpy":157', '2026-10-16'))],
    ]);
    expect(await lookup()).toEqual({ status: 'ok', rate: '158.02740002' });
    expect(
      await lookup({ base: 'USD', quote: 'JPY', date: '2026-10-16' }),
    ).toEqual({ status: 'ok', rate: '157' });
    // The limited primary is skipped until its Retry-After passes.
    expect(urls).toEqual([j('usd'), c('usd'), c('usd', '2026-10-16')]);
  });

  it('gives a headerless 429 a one-hour cooldown on that mirror alone', async () => {
    const { urls } = route([
      [j('usd'), limited()],
      [c('usd'), json(usd)],
      [c('usd', '2026-10-16'), json(file('usd', '"jpy":157', '2026-10-16'))],
      [j('usd', '2026-10-15'), json(file('usd', '"jpy":156', '2026-10-15'))],
    ]);
    await lookup();
    await vi.advanceTimersByTimeAsync(59 * 60 * 1000);
    await lookup({ base: 'USD', quote: 'JPY', date: '2026-10-16' });
    await vi.advanceTimersByTimeAsync(60 * 1000);
    await lookup({ base: 'USD', quote: 'JPY', date: '2026-10-15' });
    expect(urls).toEqual([
      j('usd'),
      c('usd'),
      c('usd', '2026-10-16'),
      j('usd', '2026-10-15'),
    ]);
  });

  it('returns retryAt at once, with no request, while both mirrors cool down', async () => {
    const now = Date.now();
    const { urls } = route([
      [j('usd'), limited({ 'retry-after': '300' })],
      [c('usd'), limited({ 'retry-after': '60' })],
    ]);
    expect(await lookup()).toEqual({
      status: 'error',
      code: 'rate-limited',
      retryAt: now + 60 * 1000,
    });
    expect(
      await lookup({ base: 'USD', quote: 'JPY', date: '2026-10-16' }),
    ).toEqual({
      status: 'error',
      code: 'rate-limited',
      retryAt: now + 60 * 1000,
    });
    expect(urls).toEqual([j('usd'), c('usd')]);
  });

  it('waits for a limited reciprocal snapshot instead of saving the coarse rate', async () => {
    route([
      [j('jpy'), json(jpy)],
      [j('usd'), limited({ 'retry-after': '60' })],
      [c('usd'), limited({ 'retry-after': '120' })],
    ]);
    expect(await lookup({ base: 'JPY', quote: 'USD', date: day })).toEqual({
      status: 'error',
      code: 'rate-limited',
      retryAt: Date.now() + 60 * 1000,
    });
  });

  it('parses Retry-After as delta seconds or an HTTP date', () => {
    const now = Date.parse('2026-10-17T12:00:00Z');
    expect(retryAfterAt('30', now)).toBe(now + 30000);
    expect(retryAfterAt('Sat, 17 Oct 2026 12:05:00 GMT', now)).toBe(
      now + 300000,
    );
    expect(retryAfterAt(null, now)).toBe(now + 3600000);
    expect(retryAfterAt('soon', now)).toBe(now + 3600000);
  });
});

describe('decimal helpers', () => {
  it('rounds half to even and parses exponents', () => {
    expect(roundDiv(5n, 2n)).toBe(2n);
    expect(roundDiv(7n, 2n)).toBe(4n);
    expect(parseDecimal('1.5e-7')).toEqual({ mantissa: 15n, scale: 8 });
  });
});

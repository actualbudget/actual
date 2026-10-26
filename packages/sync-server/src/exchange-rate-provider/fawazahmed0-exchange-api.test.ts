import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fawazahmed0ExchangeApi,
  parseDecimal,
  roundDiv,
} from './fawazahmed0-exchange-api';

const day = '2026-10-17';
const j = (code: string, date = day) =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${code}.json`;
const c = (code: string, date = day) =>
  `https://${date}.currency-api.pages.dev/v1/currencies/${code}.json`;
const file = (code: string, rates: string, date = day) =>
  `{"date":"${date}","${code}":{${rates}}}`;
const usd = file('usd', '"jpy":158.02740002');
const jpy = file('jpy', '"usd":0.0063280165');
const kwd = file('kwd', '"usd":3.21699473,"irr":5776373.10534998');

type Reply =
  | Response
  | Error
  | ((signal: AbortSignal) => Response | Promise<Response>);
type Route = [string, Reply];

const json = (body: string, status = 200, headers?: ResponseInit['headers']) =>
  new Response(body, { status, headers });
const missing = () => json('missing', 404);
const failed = () => json('failure', 500);
const held = (signal: AbortSignal): Promise<Response> =>
  new Promise((_resolve, reject) => {
    signal.addEventListener(
      'abort',
      () => reject(new DOMException('aborted', 'AbortError')),
      {
        once: true,
      },
    );
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function expectLookup(
  routes: Route[],
  expectedUrls: string[],
  expected: string | 'missing' | 'unavailable',
  input: { base: string; quote: string; date: string } = {
    base: 'USD',
    quote: 'JPY',
    date: day,
  },
  options: { timeout?: boolean; parent?: AbortController } = {},
) {
  const queue = new Map<string, Reply[]>(
    [...new Set(routes.map(([url]) => url))].map(url => [
      url,
      routes.filter(([key]) => key === url).map(([, reply]) => reply),
    ]),
  );
  const urls: string[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const key = String(url);
    urls.push(key);
    expect(init).toMatchObject({
      redirect: 'error',
      headers: { accept: 'application/json' },
    });
    const reply = queue.get(key)?.shift();
    if (reply === undefined) throw new Error(`Unexpected GET ${key}`);
    if (reply instanceof Error) throw reply;
    if (!(init?.signal instanceof AbortSignal)) {
      throw new Error('GET without abort signal');
    }
    return typeof reply === 'function' ? reply(init.signal) : reply;
  });
  vi.stubGlobal('fetch', fetcher);
  const parent = options.parent ?? new AbortController();
  const added = vi.spyOn(parent.signal, 'addEventListener');
  const removed = vi.spyOn(parent.signal, 'removeEventListener');
  const resultPromise = fawazahmed0ExchangeApi.lookup(input, {
    config: {},
    signal: parent.signal,
  });
  if (options.timeout) await vi.advanceTimersByTimeAsync(3500);
  const result = await resultPromise;
  if (expected === 'missing') {
    expect(result).toEqual({ status: 'missing' });
  } else if (expected === 'unavailable') {
    expect(result).toEqual({ status: 'error', code: 'unavailable' });
  } else {
    expect(result).toEqual({
      status: 'ok',
      base: input.base,
      quote: input.quote,
      rate: expected,
      effectiveDate: input.date,
    });
  }
  expect(urls).toEqual(expectedUrls);
  expect(vi.getTimerCount()).toBe(0);
  expect(
    removed.mock.calls.map(([event, callback]) => [event, callback]),
  ).toEqual(added.mock.calls.map(([event, callback]) => [event, callback]));
  parent.abort();
  await Promise.resolve();
  expect(urls).toEqual(expectedUrls);
  expect(vi.getTimerCount()).toBe(0);
  added.mockRestore();
  removed.mockRestore();
  return { result, urls, parent };
}

describe('built-in exchange-api provider', () => {
  it('G2 exposes exactly the direct-provider metadata', () => {
    expect({ ...fawazahmed0ExchangeApi, lookup: undefined }).toEqual({
      apiVersion: 1,
      id: 'fawazahmed0-exchange-api',
      name: 'fawazahmed0 exchange-api (market data)',
      version: '1.0.0',
      origins: ['https://cdn.jsdelivr.net', 'https://currency-api.pages.dev'],
      fields: [],
      lookup: undefined,
    });
  });

  it.each([
    [
      'H1 primary snapshot',
      [[j('usd'), json(usd)]],
      [j('usd')],
      '158.02740002',
    ],
    [
      'H2 dated mirror snapshot',
      [
        [j('usd', '2026-08-19'), missing()],
        [
          c('usd', '2026-08-19'),
          json(file('usd', '"jpy":159.48559873', '2026-08-19')),
        ],
      ],
      [j('usd', '2026-08-19'), c('usd', '2026-08-19')],
      '159.48559873',
    ],
    [
      'H3a server failure',
      [
        [j('usd'), failed()],
        [c('usd'), json(usd)],
      ],
      [j('usd'), c('usd')],
      '158.02740002',
    ],
    [
      'H3b network failure',
      [
        [j('usd'), new Error('network')],
        [c('usd'), json(usd)],
      ],
      [j('usd'), c('usd')],
      '158.02740002',
    ],
    [
      'H4 both hosts fail',
      [
        [j('usd'), failed()],
        [c('usd'), new Error('network')],
      ],
      [j('usd'), c('usd')],
      'unavailable',
    ],
    [
      'H5 both snapshots absent',
      [
        [j('usd', '2025-12-10'), missing()],
        [c('usd', '2025-12-10'), missing()],
      ],
      [j('usd', '2025-12-10'), c('usd', '2025-12-10')],
      'missing',
    ],
    [
      'H7 unknown code',
      [
        [
          j('xyz'),
          json(
            "Couldn't find the requested file /v1/currencies/xyz.json in @fawazahmed0/currency-api.",
            404,
          ),
        ],
        [c('xyz'), new Response(null, { status: 404 })],
      ],
      [j('xyz'), c('xyz')],
      'missing',
    ],
    [
      'P1 absent pair',
      [[j('usd'), json(file('usd', '"eur":0.88975695'))]],
      [j('usd')],
      'missing',
    ],
  ] satisfies Array<[string, Route[], string[], string]>)(
    '%s',
    async (name, routes, urls, expected) => {
      const date = name.startsWith('H2')
        ? '2026-08-19'
        : name.startsWith('H5')
          ? '2025-12-10'
          : day;
      const base = name.startsWith('H7') ? 'XYZ' : 'USD';
      await expectLookup(routes, urls, expected, {
        base,
        quote: name.startsWith('H7') ? 'USD' : 'JPY',
        date,
      });
    },
  );

  it.each(['H3c', 'H6'] as const)(
    '%s times out the primary then tries the mirror',
    async row => {
      await expectLookup(
        [
          [j('usd'), held],
          [c('usd'), row === 'H3c' ? json(usd) : missing()],
        ],
        [j('usd'), c('usd')],
        row === 'H3c' ? '158.02740002' : 'unavailable',
        undefined,
        { timeout: true },
      );
    },
  );

  it.each([
    ['M1 invalid JSON', '{'],
    ['M2 array', '[]'],
    ['M3 missing base object', `{"date":"${day}"}`],
    ['M4 array rates', '{"date":"2026-10-17","usd":[]}'],
    ['M5 wrong day', file('usd', '"jpy":158.02740002', '2026-10-16')],
  ])(
    '%s fails over, and two malformed hosts are unavailable',
    async (_name, body) => {
      await expectLookup(
        [
          [j('usd'), json(body)],
          [c('usd'), json(usd)],
        ],
        [j('usd'), c('usd')],
        '158.02740002',
      );
      await expectLookup(
        [
          [j('usd'), json(body)],
          [c('usd'), json(body)],
        ],
        [j('usd'), c('usd')],
        'unavailable',
      );
    },
  );

  it('M6 rejects invalid UTF-8', async () => {
    await expectLookup(
      [
        [j('usd'), new Response(new Uint8Array([0xff]))],
        [c('usd'), json(usd)],
      ],
      [j('usd'), c('usd')],
      '158.02740002',
    );
    await expectLookup(
      [
        [j('usd'), new Response(new Uint8Array([0xff]))],
        [c('usd'), new Response(new Uint8Array([0xff]))],
      ],
      [j('usd'), c('usd')],
      'unavailable',
    );
  });

  it('S1 aborts a body stalled after ten bytes', async () => {
    let aborted = false;
    let cancelled = false;
    const stalled: Reply = signal => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(10));
          signal.addEventListener('abort', () => {
            aborted = true;
            controller.error(new DOMException('aborted', 'AbortError'));
          });
        },
        cancel() {
          cancelled = true;
        },
      });
      return new Response(body);
    };
    await expectLookup(
      [
        [j('usd'), stalled],
        [c('usd'), json(usd)],
      ],
      [j('usd'), c('usd')],
      '158.02740002',
      undefined,
      { timeout: true },
    );
    expect(aborted || cancelled).toBe(true);
  });

  it('S2 rejects a streamed body beyond the cap and cancels it', async () => {
    let cancelled = false;
    let chunks = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunks < 3) {
          controller.enqueue(new Uint8Array(100000));
          chunks++;
        }
      },
      cancel() {
        cancelled = true;
      },
    });
    await expectLookup(
      [
        [j('usd'), new Response(body)],
        [c('usd'), json(usd)],
      ],
      [j('usd'), c('usd')],
      '158.02740002',
    );
    expect(chunks).toBe(3);
    expect(cancelled).toBe(true);
  });

  it('S3 accepts exactly 262144 bytes', async () => {
    await expectLookup(
      [[j('usd'), json(usd.padEnd(262144, ' '))]],
      [j('usd')],
      '158.02740002',
    );
  });

  it('S4 rejects declared over-cap length and cancels unread body', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    await expectLookup(
      [
        [
          j('usd'),
          new Response(body, { headers: { 'content-length': '262145' } }),
        ],
        [c('usd'), json(usd)],
      ],
      [j('usd'), c('usd')],
      '158.02740002',
    );
    expect(cancelled).toBe(true);
  });

  it.each([404, 500])('S5 cancels an unread %i response body', async status => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    await expectLookup(
      [
        [j('usd'), new Response(body, { status })],
        [c('usd'), json(usd)],
      ],
      [j('usd'), c('usd')],
      '158.02740002',
    );
    expect(cancelled).toBe(true);
  });

  it.each([
    ['Z1 zero', '0'],
    ['Z2 negative', '-1'],
    ['Z3 string', '"158"'],
    ['Z4 null', 'null'],
    ['Z5 infinity', '1e400'],
  ])('%s returns missing, never zero', async (_name, literal) => {
    await expectLookup(
      [[j('usd'), json(file('usd', `"jpy":${literal}`))]],
      [j('usd')],
      'missing',
    );
  });

  it('A1 makes no GET when the parent is already aborted', async () => {
    const parent = new AbortController();
    parent.abort();
    await expectLookup([], [], 'unavailable', undefined, { parent });
  });

  it.each(['headers', 'body'] as const)(
    'A2 parent abort during %s stops mirror GET',
    async phase => {
      const parent = new AbortController();
      let started = false;
      const response: Reply = signal => {
        started = true;
        if (phase === 'headers') return held(signal);
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              signal.addEventListener('abort', () =>
                controller.error(new DOMException('aborted', 'AbortError')),
              );
            },
          }),
        );
      };
      const pending = expectLookup(
        [[j('usd'), response]],
        [j('usd')],
        'unavailable',
        undefined,
        { parent },
      );
      await vi.waitFor(() => expect(started).toBe(true));
      parent.abort();
      await pending;
    },
  );

  it('A3 parent abort during quote file stops further GETs', async () => {
    const parent = new AbortController();
    let started = false;
    const pending = expectLookup(
      [
        [j('jpy'), json(jpy)],
        [
          j('usd'),
          signal => {
            started = true;
            return held(signal);
          },
        ],
      ],
      [j('jpy'), j('usd')],
      'unavailable',
      { base: 'JPY', quote: 'USD', date: day },
      { parent },
    );
    await vi.waitFor(() => expect(started).toBe(true));
    parent.abort();
    await pending;
  });

  it('F1 returns missing for a future date without a GET', async () => {
    await expectLookup([], [], 'missing', {
      base: 'USD',
      quote: 'JPY',
      date: '2026-10-18',
    });
  });

  it.each([
    { base: 'usd', quote: 'JPY', date: day },
    { base: 'USD', quote: 'USD', date: day },
    { base: 'USD', quote: 'JPY', date: '2026-02-30' },
    { base: '', quote: 'JPY', date: day },
  ])('V1 rejects invalid input %j without a GET', async input => {
    await expectLookup([], [], 'unavailable', input);
  });

  it.each([
    [
      'D1 large direct',
      'USD',
      'JPY',
      [[j('usd'), json(usd)]],
      [j('usd')],
      '158.02740002',
    ],
    [
      'D2 precise inverse',
      'JPY',
      'USD',
      [
        [j('jpy'), json(jpy)],
        [j('usd'), json(usd)],
      ],
      [j('jpy'), j('usd')],
      '0.006328016533041',
    ],
    [
      'D3 unavailable inverse snapshot',
      'JPY',
      'USD',
      [
        [j('jpy'), json(jpy)],
        [j('usd'), missing()],
        [c('usd'), missing()],
      ],
      [j('jpy'), j('usd'), c('usd')],
      '0.0063280165',
    ],
    [
      'D4 failed inverse snapshot',
      'JPY',
      'USD',
      [
        [j('jpy'), json(jpy)],
        [j('usd'), failed()],
        [c('usd'), failed()],
      ],
      [j('jpy'), j('usd'), c('usd')],
      '0.0063280165',
    ],
    [
      'D5 KWD precise inverse',
      'USD',
      'KWD',
      [
        [j('usd'), json(file('usd', '"kwd":0.31084913'))],
        [j('kwd'), json(kwd)],
      ],
      [j('usd'), j('kwd')],
      '0.310849125948055',
    ],
    [
      'D6 KWD direct',
      'KWD',
      'USD',
      [[j('kwd'), json(kwd)]],
      [j('kwd')],
      '3.21699473',
    ],
    [
      'D7 USD/IQD',
      'USD',
      'IQD',
      [[j('usd'), json(file('usd', '"iqd":1515.96887131'))]],
      [j('usd')],
      '1515.96887131',
    ],
    [
      'D7 IQD/USD',
      'IQD',
      'USD',
      [
        [j('iqd'), json(file('iqd', '"usd":0.00065964415'))],
        [j('usd'), json(file('usd', '"iqd":1515.96887131'))],
      ],
      [j('iqd'), j('usd')],
      '0.000659644151622',
    ],
    [
      'E1 exponent inverse',
      'IRR',
      'KWD',
      [
        [j('irr'), json(file('irr', '"kwd":1.7311901e-7'))],
        [j('kwd'), json(kwd)],
      ],
      [j('irr'), j('kwd')],
      '0.000000173119011',
    ],
    [
      'E2 exponent direct fallback',
      'IRR',
      'KWD',
      [
        [j('irr'), json(file('irr', '"kwd":1.7311901e-7'))],
        [j('kwd'), missing()],
        [c('kwd'), missing()],
      ],
      [j('irr'), j('kwd'), c('kwd')],
      '0.00000017311901',
    ],
  ] satisfies Array<[string, string, string, Route[], string[], string]>)(
    '%s',
    async (_name, base, quote, routes, urls, expected) => {
      await expectLookup(routes, urls, expected, { base, quote, date: day });
    },
  );

  it.each([
    ['E3 half-even down', '2.5e-15', '0.000000000000002'],
    ['E3 half-even up', '3.5e-15', '0.000000000000004'],
    ['E3 rounds to zero', '4e-16', 'missing'],
    ['E4 decimal normalization', '0.50', '0.5'],
    ['E4 exponent normalization', '1E-7', '0.0000001'],
  ])('%s', async (_name, literal, expected) => {
    await expectLookup(
      [
        [j('irr'), json(file('irr', `"kwd":${literal}`))],
        [j('kwd'), missing()],
        [c('kwd'), missing()],
      ],
      [j('irr'), j('kwd'), c('kwd')],
      expected,
      { base: 'IRR', quote: 'KWD', date: day },
    );
  });

  it.each([
    ['E5 max integer', '999999999999.5', '999999999999.5'],
    ['E5 integer out of range', '1000000000000', 'missing'],
    ['E5 positive exponent out of range', '1e21', 'missing'],
  ])('%s', async (_name, literal, expected) => {
    await expectLookup(
      [[j('usd'), json(file('usd', `"jpy":${literal}`))]],
      [j('usd')],
      expected,
    );
  });

  it('E6 returns missing when both directions round to zero', async () => {
    await expectLookup(
      [
        [j('jpy'), json(file('jpy', '"usd":1e-22'))],
        [j('usd'), json(file('usd', '"jpy":1e+22'))],
      ],
      [j('jpy'), j('usd')],
      'missing',
      { base: 'JPY', quote: 'USD', date: day },
    );
  });

  it.each([
    [25n, 10n, 2n],
    [35n, 10n, 4n],
    [26n, 10n, 3n],
  ])('roundDiv(%s, %s) is %s', (num, den, expected) => {
    expect(roundDiv(num, den)).toBe(expected);
  });
  it('parses a positive exponent as a negative decimal scale', () => {
    expect(parseDecimal('1e+21')).toEqual({ mantissa: 1n, scale: -21 });
  });
});

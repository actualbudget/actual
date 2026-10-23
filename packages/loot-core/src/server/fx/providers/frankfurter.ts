import { fetch as platformFetch } from '#platform/server/fetch';

// Daily reference rates published by central banks, from the open source
// Frankfurter service (https://frankfurter.dev). It needs no account or
// key, answers browsers directly, and can be self-hosted.
export const FRANKFURTER_SOURCE = 'frankfurter';
export const DEFAULT_FRANKFURTER_URL = 'https://api.frankfurter.dev';

export type FetchFn = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

export type FrankfurterRate = { date: string; rate: number };

// The first and last day the service has rates for a currency, when known
export type FrankfurterCoverage = {
  startDate: string | null;
  endDate: string | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// A server that doesn't answer in time fails the request instead of
// holding it up, unless the caller gives its own deadline
const REQUEST_TIMEOUT_MS = 30_000;

function getUrl(baseUrl: string, path: string, params?: URLSearchParams) {
  const query = params ? `?${params.toString()}` : '';
  return `${baseUrl.replace(/\/+$/, '')}${path}${query}`;
}

function toDate(value: unknown): string | null {
  return typeof value === 'string' && DATE.test(value) ? value : null;
}

async function getJson(
  fetchFn: FetchFn,
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetchFn(url, {
    headers: { accept: 'application/json' },
    // The platform fetch otherwise treats a redirect, e.g. from http to
    // https, as an expired login and reloads the app
    redirect: 'follow',
    signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : `status ${response.status}`;
    throw new Error(`Frankfurter could not answer: ${message}`);
  }
  return body;
}

// The currencies the service has rates for, by code, with the days it has
// them from and to
export async function fetchFrankfurterCurrencies(
  baseUrl: string,
  fetchFn: FetchFn = platformFetch,
  signal?: AbortSignal,
): Promise<Map<string, FrankfurterCoverage>> {
  const body = await getJson(
    fetchFn,
    getUrl(baseUrl, '/v2/currencies'),
    signal,
  );
  if (!Array.isArray(body)) {
    throw new Error('Frankfurter sent an unexpected list of currencies');
  }
  const currencies = new Map<string, FrankfurterCoverage>();
  for (const entry of body) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'iso_code' in entry &&
      typeof entry.iso_code === 'string'
    ) {
      currencies.set(entry.iso_code, {
        startDate: 'start_date' in entry ? toDate(entry.start_date) : null,
        endDate: 'end_date' in entry ? toDate(entry.end_date) : null,
      });
    }
  }
  return currencies;
}

// How many units of `quote` one unit of `base` was worth on each day from
// `startDate` to `endDate`, or on average over each month, dated its first
// day, with `group: 'month'`
export async function fetchFrankfurterRates(
  {
    baseUrl,
    base,
    quote,
    startDate,
    endDate,
    group,
    signal,
  }: {
    baseUrl: string;
    base: string;
    quote: string;
    startDate: string;
    endDate: string;
    group?: 'month';
    signal?: AbortSignal;
  },
  fetchFn: FetchFn = platformFetch,
): Promise<FrankfurterRate[]> {
  const params = new URLSearchParams({
    base,
    quotes: quote,
    from: startDate,
    to: endDate,
  });
  if (group) {
    params.set('group', group);
  }
  const body = await getJson(
    fetchFn,
    getUrl(baseUrl, '/v2/rates', params),
    signal,
  );
  if (!Array.isArray(body)) {
    throw new Error('Frankfurter sent unexpected rates');
  }

  const rates: FrankfurterRate[] = [];
  for (const entry of body) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'date' in entry &&
      'base' in entry &&
      'quote' in entry &&
      'rate' in entry &&
      typeof entry.date === 'string' &&
      DATE.test(entry.date) &&
      entry.base === base &&
      entry.quote === quote &&
      typeof entry.rate === 'number' &&
      Number.isFinite(entry.rate) &&
      entry.rate > 0
    ) {
      rates.push({ date: entry.date, rate: entry.rate });
    }
  }
  return rates;
}

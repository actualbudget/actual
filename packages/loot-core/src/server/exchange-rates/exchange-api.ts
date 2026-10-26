import { fetchQuiet } from '#platform/server/fetch';
import * as monthUtils from '#shared/months';

import type { JsonValue } from './history-codec';

export const EXCHANGE_API = {
  id: 'exchange-api',
  name: 'fawazahmed0 exchange-api (market data)',
  version: '1.0.0',
} as const;

export type MissingReason = 'snapshot-not-found' | 'quote-omitted';
export type ExchangeApiResult =
  | { status: 'ok'; rate: string }
  | { status: 'missing'; reason: MissingReason }
  | { status: 'error'; code: 'unavailable' }
  | { status: 'error'; code: 'rate-limited'; retryAt: number };

type Rates = { [key: string]: JsonValue };
type FileResult =
  | { kind: 'ok'; rates: Rates }
  | { kind: 'not-found' }
  | { kind: 'limited'; retryAt: number }
  | { kind: 'fail' };

const MAX_BYTES = 262144;
const ATTEMPT_MS = 3500;
const HEADERLESS_COOLDOWN_MS = 60 * 60 * 1000;
const PRECISION = 10n ** 15n;
const MIRRORS = [
  (date: string, code: string) =>
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${code}.json`,
  (date: string, code: string) =>
    `https://${date}.currency-api.pages.dev/v1/currencies/${code}.json`,
];

// Each mirror's server-imposed limit holds until this instant, whatever the other mirror does.
const eligibleAt = MIRRORS.map(() => 0);
const sharedFiles = new Map<string, Promise<FileResult>>();

export function resetExchangeApiState() {
  eligibleAt.fill(0);
  sharedFiles.clear();
}

export function roundDiv(num: bigint, den: bigint): bigint {
  const quotient = num / den;
  const remainder = num % den;
  const twice = remainder * 2n;
  return twice > den || (twice === den && quotient % 2n !== 0n)
    ? quotient + 1n
    : quotient;
}

export function parseDecimal(text: string) {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(text);
  if (!match) return null;
  const fractional = match[2] ?? '';
  return {
    mantissa: BigInt(match[1] + fractional),
    scale: fractional.length - Number(match[3] ?? 0),
  };
}

function decimal(value: number, inverse: boolean): string | null {
  const parsed = parseDecimal(String(value));
  if (!parsed) return null;
  const power = inverse ? parsed.scale + 15 : 15 - parsed.scale;
  const numerator = inverse ? 1n : parsed.mantissa;
  const denominator = inverse ? parsed.mantissa : 1n;
  const scaled =
    power >= 0
      ? roundDiv(numerator * 10n ** BigInt(power), denominator)
      : roundDiv(numerator, denominator * 10n ** BigInt(-power));
  if (scaled === 0n || scaled >= 10n ** 27n) return null;
  const whole = scaled / PRECISION;
  const fraction = (scaled % PRECISION)
    .toString()
    .padStart(15, '0')
    .replace(/0+$/, '');
  const rendered = fraction ? `${whole}.${fraction}` : whole.toString();
  return rendered.length <= 32 ? rendered : null;
}

function isRecord(value: JsonValue | undefined): value is Rates {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

/** Delta seconds or an HTTP date; anything else gets the one-hour default. */
export function retryAfterAt(header: string | null, now: number): number {
  const text = header?.trim() ?? '';
  if (/^\d+$/.test(text)) return now + Number(text) * 1000;
  const date = text ? Date.parse(text) : NaN;
  return Number.isFinite(date)
    ? Math.max(now, date)
    : now + HEADERLESS_COOLDOWN_MS;
}

async function attempt(
  url: string,
  code: string,
  date: string,
): Promise<FileResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_MS);
  let response: Response | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let fullyRead = false;
  try {
    response = await fetchQuiet(url, {
      signal: controller.signal,
      redirect: 'error',
      credentials: 'omit',
      headers: { accept: 'application/json' },
    });
    if (response.status === 429) {
      return {
        kind: 'limited',
        retryAt: retryAfterAt(response.headers.get('retry-after'), Date.now()),
      };
    }
    if (response.status === 404) return { kind: 'not-found' };
    if (response.status !== 200) return { kind: 'fail' };
    const declared = response.headers.get('content-length');
    if (declared !== null && Number(declared) > MAX_BYTES) {
      return { kind: 'fail' };
    }
    if (!response.body) return { kind: 'fail' };
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const next = await reader.read();
      if (next.done) {
        fullyRead = true;
        break;
      }
      size += next.value.byteLength;
      if (size > MAX_BYTES) return { kind: 'fail' };
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(size);
    let position = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, position);
      position += chunk.byteLength;
    }
    const parsed: JsonValue = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    );
    if (!isRecord(parsed) || parsed.date !== date || !isRecord(parsed[code])) {
      return { kind: 'fail' };
    }
    return { kind: 'ok', rates: parsed[code] };
  } catch {
    return { kind: 'fail' };
  } finally {
    clearTimeout(timer);
    if (!fullyRead) {
      try {
        if (reader) {
          void reader.cancel().catch(() => undefined);
        } else if (response?.body) {
          void response.body.cancel().catch(() => undefined);
        }
      } catch {
        // A body that already failed may refuse cancellation.
      }
    }
    controller.abort();
  }
}

/** One base-currency snapshot, tried on each eligible mirror in order. */
async function readFile(code: string, date: string): Promise<FileResult> {
  let notFound = 0;
  let failed = false;
  for (const [index, mirror] of MIRRORS.entries()) {
    if (eligibleAt[index] > Date.now()) continue;
    const result = await attempt(mirror(date, code), code, date);
    if (result.kind === 'ok') return result;
    if (result.kind === 'limited') eligibleAt[index] = result.retryAt;
    else if (result.kind === 'not-found') notFound++;
    else failed = true;
  }
  if (notFound === MIRRORS.length) return { kind: 'not-found' };
  if (failed) return { kind: 'fail' };
  const waiting = eligibleAt.filter(at => at > Date.now());
  // A mirror limited now, with the rest missing the file, is still worth retrying.
  return waiting.length > 0
    ? { kind: 'limited', retryAt: Math.min(...waiting) }
    : { kind: 'fail' };
}

// Simultaneous lookups against one host/date/base file share one read; each caller
// still races its own signal. ponytail: an abandoned shared read runs to its 3.5 s
// attempt timeout instead of cancelling early.
function getFile(code: string, date: string, signal: AbortSignal) {
  const key = `${code}|${date}`;
  let work = sharedFiles.get(key);
  if (!work) {
    const read = readFile(code, date).finally(() => {
      if (sharedFiles.get(key) === read) sharedFiles.delete(key);
    });
    work = read;
    sharedFiles.set(key, work);
  }
  return new Promise<FileResult>(resolve => {
    const abort = () => resolve({ kind: 'fail' });
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    void work.then(result => {
      signal.removeEventListener('abort', abort);
      resolve(result);
    });
  });
}

function validRequest(base: string, quote: string, date: string) {
  if (
    !/^[A-Z]{3}$/.test(base) ||
    !/^[A-Z]{3}$/.test(quote) ||
    base === quote ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

const unavailable = (): ExchangeApiResult => ({
  status: 'error',
  code: 'unavailable',
});

function usableQuote(value: JsonValue | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Quote-per-base rate for one calendar date, read directly from the public mirrors. */
export async function lookupExchangeApi(
  { base, quote, date }: { base: string; quote: string; date: string },
  { signal }: { signal: AbortSignal },
): Promise<ExchangeApiResult> {
  try {
    if (
      !validRequest(base, quote, date) ||
      signal.aborted ||
      date > monthUtils.currentDay()
    ) {
      return unavailable();
    }
    const direct = await getFile(base.toLowerCase(), date, signal);
    if (signal.aborted || direct.kind === 'fail') return unavailable();
    if (direct.kind === 'limited') {
      return { status: 'error', code: 'rate-limited', retryAt: direct.retryAt };
    }
    if (direct.kind === 'not-found') {
      return { status: 'missing', reason: 'snapshot-not-found' };
    }
    const value = direct.rates[quote.toLowerCase()];
    if (value === undefined) {
      return { status: 'missing', reason: 'quote-omitted' };
    }
    if (!usableQuote(value)) return unavailable();
    let rate = value >= 1 ? decimal(value, false) : null;
    if (value < 1) {
      const reciprocal = await getFile(quote.toLowerCase(), date, signal);
      if (signal.aborted) return unavailable();
      // Wait for the precise inverse rather than saving the coarse direct rate.
      if (reciprocal.kind === 'limited') {
        return {
          status: 'error',
          code: 'rate-limited',
          retryAt: reciprocal.retryAt,
        };
      }
      const inverse =
        reciprocal.kind === 'ok'
          ? reciprocal.rates[base.toLowerCase()]
          : undefined;
      rate =
        usableQuote(inverse) && inverse >= 1 ? decimal(inverse, true) : null;
      rate ??= decimal(value, false);
    }
    return rate ? { status: 'ok', rate } : unavailable();
  } catch {
    return unavailable();
  }
}

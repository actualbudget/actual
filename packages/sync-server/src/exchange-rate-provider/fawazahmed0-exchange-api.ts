import type { RateProviderPlugin } from './types';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type Rates = { [key: string]: JsonValue };
type FileResult =
  | { kind: 'ok'; rates: Rates }
  | { kind: 'not-found' }
  | { kind: 'fail' };

const MAX_BYTES = 262144;
const ATTEMPT_MS = 3500;
const PRECISION = 10n ** 15n;

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

function isRecord(value: JsonValue): value is Rates {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function attempt(
  url: string,
  code: string,
  date: string,
  parent: AbortSignal,
): Promise<FileResult> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, ATTEMPT_MS);
  parent.addEventListener('abort', abort);
  if (parent.aborted) controller.abort();
  let response: Response | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let fullyRead = false;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      redirect: 'error',
      headers: { accept: 'application/json' },
    });
    if (parent.aborted || controller.signal.aborted) return { kind: 'fail' };
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
    if (parent.aborted || controller.signal.aborted) return { kind: 'fail' };
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
    parent.removeEventListener('abort', abort);
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

async function getFile(
  code: string,
  date: string,
  parent: AbortSignal,
): Promise<FileResult> {
  let notFound = 0;
  for (const url of [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${code}.json`,
    `https://${date}.currency-api.pages.dev/v1/currencies/${code}.json`,
  ]) {
    if (parent.aborted) return { kind: 'fail' };
    const result = await attempt(url, code, date, parent);
    if (parent.aborted) return { kind: 'fail' };
    if (result.kind === 'ok') return result;
    if (result.kind === 'not-found') notFound++;
  }
  return { kind: notFound === 2 ? 'not-found' : 'fail' };
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

const unavailable = () => ({ status: 'error', code: 'unavailable' }) as const;
const missing = () => ({ status: 'missing' }) as const;

export const fawazahmed0ExchangeApi = {
  apiVersion: 1,
  id: 'fawazahmed0-exchange-api',
  name: 'fawazahmed0 exchange-api (market data)',
  version: '1.0.0',
  origins: ['https://cdn.jsdelivr.net', 'https://currency-api.pages.dev'],
  fields: [],
  async lookup(
    { base, quote, date }: { base: string; quote: string; date: string },
    { signal }: { config: Record<string, string>; signal: AbortSignal },
  ) {
    try {
      if (!validRequest(base, quote, date) || signal.aborted) {
        return unavailable();
      }
      if (date > new Date().toISOString().slice(0, 10)) return missing();
      const direct = await getFile(base.toLowerCase(), date, signal);
      if (signal.aborted || direct.kind === 'fail') return unavailable();
      if (direct.kind === 'not-found') return missing();
      const value = direct.rates[quote.toLowerCase()];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return missing();
      }
      let rate = value >= 1 ? decimal(value, false) : null;
      if (value < 1) {
        const reciprocal = await getFile(quote.toLowerCase(), date, signal);
        if (signal.aborted) return unavailable();
        const inverse =
          reciprocal.kind === 'ok'
            ? reciprocal.rates[base.toLowerCase()]
            : null;
        rate =
          typeof inverse === 'number' &&
          Number.isFinite(inverse) &&
          inverse >= 1
            ? decimal(inverse, true)
            : null;
        rate ??= decimal(value, false);
      }
      return rate
        ? ({ status: 'ok', base, quote, rate, effectiveDate: date } as const)
        : missing();
    } catch {
      return unavailable();
    }
  },
} satisfies RateProviderPlugin;

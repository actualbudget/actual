import { roundEven } from './amount-rescale';

// Bounds keep exact BigInt arithmetic small: the rate denominator is at most
// 10^15 and the input is checked for length before any pattern matching.
const MAX_RATE_LENGTH = 32;
const RATE_PATTERN = /^(\d{1,12})(?:\.(\d{1,15}))?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a positive rate and returns its canonical decimal string. */
export function parseRate(input: unknown): string {
  let text: string;
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) {
      throw new Error('rate-invalid');
    }
    text = String(input);
  } else if (typeof input === 'string') {
    text = input;
  } else {
    throw new Error('rate-invalid');
  }
  if (text.length > MAX_RATE_LENGTH) {
    throw new Error('rate-invalid');
  }
  const match = RATE_PATTERN.exec(text);
  if (!match) {
    throw new Error('rate-invalid');
  }
  const whole = match[1].replace(/^0+(?=\d)/, '');
  const fraction = (match[2] ?? '').replace(/0+$/, '');
  if (/^0+$/.test(whole) && fraction === '') {
    throw new Error('rate-invalid');
  }
  return fraction ? `${whole}.${fraction}` : whole;
}

function rateFraction(rate: string) {
  const [whole, fraction = ''] = parseRate(rate).split('.');
  return {
    numerator: BigInt(whole + fraction),
    denominator: 10n ** BigInt(fraction.length),
  };
}

function scale(precision: number): bigint {
  if (!Number.isInteger(precision) || precision < 0 || precision > 15) {
    throw new Error('precision-invalid');
  }
  return 10n ** BigInt(precision);
}

function toSafeInteger(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new Error('amount-out-of-range');
  }
  return result;
}

function integer(value: number): bigint {
  if (!Number.isSafeInteger(value)) {
    throw new Error('amount-invalid');
  }
  return BigInt(value);
}

/** baseInteger = bankersRound(native / 10^np / rate * 10^bp) */
export function nativeToBase(
  nativeInteger: number,
  nativePrecision: number,
  basePrecision: number,
  rate: string,
): number {
  const { numerator, denominator } = rateFraction(rate);
  return toSafeInteger(
    roundEven(
      integer(nativeInteger) * scale(basePrecision) * denominator,
      numerator * scale(nativePrecision),
    ),
  );
}

/** The exact base value of a native integer, before rounding. */
export function nativeToBaseFraction(
  nativeInteger: number,
  nativePrecision: number,
  basePrecision: number,
  rate: string,
): { numerator: bigint; denominator: bigint } {
  const { numerator, denominator } = rateFraction(rate);
  return {
    numerator: integer(nativeInteger) * scale(basePrecision) * denominator,
    denominator: numerator * scale(nativePrecision),
  };
}

/** nativeInteger = bankersRound(base / 10^bp * rate * 10^np) */
export function baseToNative(
  baseInteger: number,
  basePrecision: number,
  nativePrecision: number,
  rate: string,
): number {
  const { numerator, denominator } = rateFraction(rate);
  return toSafeInteger(
    roundEven(
      integer(baseInteger) * numerator * scale(nativePrecision),
      denominator * scale(basePrecision),
    ),
  );
}

/**
 * The reciprocal of a rate (1 / rate), rounded half-even to the 15 decimal
 * places a rate can hold. Throws `rate-invalid` when the reciprocal rounds to
 * zero or exceeds the largest storable rate.
 */
export function invertRate(rate: string): string {
  const { numerator, denominator } = rateFraction(rate);
  const digits = roundEven(denominator * 10n ** 15n, numerator)
    .toString()
    .padStart(16, '0');
  return parseRate(`${digits.slice(0, -15)}.${digits.slice(-15)}`);
}

export function isValidDate(date: unknown): date is string {
  if (typeof date !== 'string' || !DATE_PATTERN.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

/** Midnight UTC for a date-only value, matching date-only storage. */
export function utcMidnight(date: string): string {
  if (!isValidDate(date)) {
    throw new Error('date-invalid');
  }
  return `${date}T00:00:00.000Z`;
}

/** True only for the canonical `toISOString()` form, so string order is time order. */
export function isCanonicalTimestamp(timestamp: unknown): timestamp is string {
  if (typeof timestamp !== 'string') return false;
  const parsed = new Date(timestamp);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === timestamp;
}

/** Last representable instant of a date-only value in UTC. */
export function utcEndOfDay(date: string): string {
  if (!isValidDate(date)) {
    throw new Error('date-invalid');
  }
  return `${date}T23:59:59.999Z`;
}

export function utcDay(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function addUtcDays(date: string, days: number): string {
  const parsed = new Date(utcMidnight(date));
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

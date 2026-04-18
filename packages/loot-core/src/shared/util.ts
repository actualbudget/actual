// @ts-strict-ignore
import { formatDistanceToNow, type Locale } from 'date-fns';

import { type Currency } from './currencies';
export function last<T>(arr: Array<T>) {
  return arr[arr.length - 1];
}

export function getChangedValues<T extends { id?: string }>(obj1: T, obj2: T) {
  const diff: Partial<T> = {};
  const keys = Object.keys(obj2);
  let hasChanged = false;

  // Keep the id field because this is mostly used to diff database
  // objects
  if (obj1.id) {
    diff.id = obj1.id;
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (obj1[key] !== obj2[key]) {
      diff[key] = obj2[key];
      hasChanged = true;
    }
  }

  return hasChanged ? diff : null;
}

export function hasFieldsChanged<T extends object>(
  obj1: T,
  obj2: T,
  fields: Array<keyof T>,
) {
  let changed = false;
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (obj1[field] !== obj2[field]) {
      changed = true;
      break;
    }
  }
  return changed;
}

export type Diff<T extends { id: string }> = {
  added: T[];
  updated: Partial<T>[];
  deleted: Pick<T, 'id'>[];
};

export function applyChanges<T extends { id: string }>(
  changes: Diff<T>,
  items: T[],
) {
  items = [...items];

  if (changes.added) {
    changes.added.forEach(add => {
      items.push(add);
    });
  }

  if (changes.updated) {
    changes.updated.forEach(({ id, ...fields }) => {
      const idx = items.findIndex(t => t.id === id);
      items[idx] = {
        ...items[idx],
        ...fields,
      };
    });
  }

  if (changes.deleted) {
    changes.deleted.forEach(t => {
      const idx = items.findIndex(t2 => t.id === t2.id);
      if (idx !== -1) {
        items.splice(idx, 1);
      }
    });
  }

  return items;
}

export function partitionByField<T, K extends keyof T>(data: T[], field: K) {
  const res = new Map();
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const key = item[field];

    const items = res.get(key) || [];
    items.push(item);

    res.set(key, items);
  }
  return res;
}

export function groupBy<T, K extends keyof T>(data: T[], field: K) {
  const res = new Map<T[K], T[]>();
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const key = item[field];
    const existing = res.get(key) || [];
    res.set(key, existing.concat([item]));
  }
  return res;
}

// This should replace the existing `groupById` function, since a
// `Map` is better, but we can't swap it out because `Map` has a
// different API and we need to go through and update everywhere that
// uses it.
function _groupById<T extends { id: string }>(data: T[]) {
  const res = new Map<string, T>();
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    res.set(item.id, item);
  }
  return res;
}

export function diffItems<T extends { id: string }>(
  items: T[],
  newItems: T[],
): Diff<T> {
  const grouped = _groupById(items);
  const newGrouped = _groupById(newItems);
  const added: T[] = [];
  const updated: Partial<T>[] = [];

  const deleted: Pick<T, 'id'>[] = items
    .filter(item => !newGrouped.has(item.id))
    .map(item => ({ id: item.id }));

  newItems.forEach(newItem => {
    const item = grouped.get(newItem.id);
    if (!item) {
      added.push(newItem);
    } else {
      const changes = getChangedValues(item, newItem);
      if (changes) {
        updated.push(changes);
      }
    }
  });

  return { added, updated, deleted };
}

export function groupById<T extends { id: string }>(
  data: T[] | null | undefined,
): Record<string, T> {
  if (!data) {
    return {};
  }
  const res: { [key: string]: T } = {};
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    res[item.id] = item;
  }
  return res;
}

export function setIn(
  map: Map<string, unknown>,
  keys: string[],
  item: unknown,
): void {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (i === keys.length - 1) {
      map.set(key, item);
    } else {
      if (!map.has(key)) {
        map.set(key, new Map<string, unknown>());
      }

      map = map.get(key) as Map<string, unknown>;
    }
  }
}

export function getIn(map, keys) {
  let item = map;
  for (let i = 0; i < keys.length; i++) {
    item = item.get(keys[i]);

    if (item == null) {
      return item;
    }
  }
  return item;
}

export function fastSetMerge<T>(set1: Set<T>, set2: Set<T>) {
  const finalSet = new Set(set1);
  const iter = set2.values();
  let value = iter.next();
  while (!value.done) {
    finalSet.add(value.value);
    value = iter.next();
  }
  return finalSet;
}

export function titleFirst(str: string | null | undefined) {
  if (!str || str.length <= 1) {
    return str?.toUpperCase() ?? '';
  }
  return str[0].toUpperCase() + str.slice(1);
}

export function reapplyThousandSeparators(amountText: string) {
  if (!amountText || typeof amountText !== 'string') {
    return amountText;
  }

  const { decimalSeparator, thousandsSeparator } = getNumberFormat();
  const [integerPartRaw, decimalPart = ''] = amountText.split(decimalSeparator);

  const numericValue = Number(
    integerPartRaw.replaceAll(thousandsSeparator, ''),
  );
  if (isNaN(numericValue)) {
    return amountText; // Return original if parsing fails
  }

  const integerPart = numericValue
    .toLocaleString('en-US')
    .replaceAll(',', thousandsSeparator);
  return decimalPart
    ? integerPart + decimalSeparator + decimalPart
    : integerPart;
}

export function appendDecimals(
  amountText: string,
  hideDecimals = false,
): string {
  const { decimalSeparator: separator } = getNumberFormat();
  let result = amountText;
  if (result.slice(-1) === separator) {
    result = result.slice(0, -1);
  }
  if (!hideDecimals) {
    result = result.replaceAll(/[,.]/g, '');
    result = result.replace(/^0+(?!$)/, '');
    result = result.padStart(3, '0');
    result = result.slice(0, -2) + separator + result.slice(-2);
  }
  return amountToFormatted(formattedToAmount(result));
}

const NUMBER_FORMATS = [
  'comma-dot',
  'dot-comma',
  'space-comma',
  'apostrophe-dot',
  'sat-comma',
  'comma-dot-in',
] as const;

export type NumberFormats = (typeof NUMBER_FORMATS)[number];

function isNumberFormat(input: string = ''): input is NumberFormats {
  return (NUMBER_FORMATS as readonly string[]).includes(input);
}

export const numberFormats: Array<{
  value: NumberFormats;
  label: string;
  labelNoFraction: string;
}> = [
  { value: 'comma-dot', label: '1,000.33', labelNoFraction: '1,000' },
  { value: 'dot-comma', label: '1.000,33', labelNoFraction: '1.000' },
  {
    value: 'space-comma',
    label: '1\u202F000,33',
    labelNoFraction: '1\u202F000',
  },
  { value: 'apostrophe-dot', label: "1'000.33", labelNoFraction: "1'000" },
  { value: 'comma-dot-in', label: '1,00,000.33', labelNoFraction: '1,00,000' },
  {
    value: 'sat-comma',
    label: '1.23\u202F456\u202F780',
    labelNoFraction: '123,456,780',
  },
];

let numberFormatConfig: {
  format: NumberFormats;
  hideFraction: boolean;
} = {
  format: 'comma-dot',
  hideFraction: false,
};

export function parseNumberFormat({
  format,
  hideFraction,
}: {
  format?: string;
  hideFraction?: string | boolean;
}) {
  return {
    format: isNumberFormat(format) ? format : 'comma-dot',
    hideFraction: String(hideFraction) === 'true',
  };
}

export function setNumberFormat(config: typeof numberFormatConfig) {
  numberFormatConfig = config;
}

/**
 * Custom formatter for Bitcoin/Satoshi amounts using the "Satcomma standard".
 *
 * The Satcomma standard (proposed by Mark Nugent and ProgrammableTX) adjusts digit group
 * separators for better readability of bitcoin fractions. Unlike traditional number formatting
 * which groups from the left, Satcomma groups fractional digits from the right (starting at
 * the decimal point) to make it easier to identify the Satoshi value.
 *
 * For example:
 * - 0.00 025 000 bitcoin (25,000 satoshis)
 * - 12.34 567 890 bitcoin
 *
 * This makes it easier to quickly identify values in satoshis (the smallest unit, where
 * 1 bitcoin = 100,000,000 satoshis) by grouping digits after the 2nd and 5th decimal places
 * using narrow non-breaking spaces (U+202F).
 *
 * When hideFraction is true, amounts are displayed in whole satoshis without decimals.
 *
 * @see https://bitcoin.design/guide/designing-products/units-and-symbols/#satcomma-standard
 * @see https://medium.com/@mark.nugent.iv/grouping-bitcoins-fractional-digits-an-idea-whose-time-has-come-22d9dad8ac51
 * @see https://medium.com/coinmonks/the-satcomma-standard-89f1e7c2aede
 */
class SatNumberFormat implements Intl.NumberFormat {
  private locale: string;
  private hideFraction: boolean;

  constructor(locales?: string | string[], hideFraction?: boolean) {
    this.locale = Array.isArray(locales) ? locales[0] : locales || 'en-US';
    this.hideFraction = hideFraction ?? false;
  }

  format(value: number): string {
    return this.formatToParts(value)
      .map(part => part.value)
      .join('');
  }

  // Methods to satisfy Intl.NumberFormat interface
  formatToParts(value: number | bigint = 0): Intl.NumberFormatPart[] {
    const numValue = Number(value);

    // Short-circuit to native Intl.NumberFormat for non-finite numbers (NaN, Infinity)
    // to avoid errors from toFixed(8)/split operations
    if (!Number.isFinite(numValue)) {
      return new Intl.NumberFormat(this.locale).formatToParts(numValue);
    }

    const parts: Intl.NumberFormatPart[] = [];
    const intFormatter = new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    // If hideFraction is true, multiply by 100 million to convert BTC to satoshis
    if (this.hideFraction) {
      const satAmount = Math.round(numValue * 100_000_000);
      return intFormatter.formatToParts(satAmount);
    }

    // Capture the sign up-front to handle negative values between -1 and 0
    const isNegative = numValue < 0;
    const absValue = Math.abs(numValue);

    // For fractional display, format with 8 decimal places and special grouping
    const [integerPart, fractionalPart] = absValue.toFixed(8).split('.');

    // Prepend minus sign if negative
    if (isNegative) {
      parts.push({ type: 'minusSign', value: '-' });
    }

    // Get parts for integer (includes group separators)
    const intParts = intFormatter.formatToParts(parseInt(integerPart, 10));
    parts.push(...intParts);

    // Add decimal separator
    parts.push({ type: 'decimal', value: '.' });

    // Process fraction part (with special narrow no-break spaces after 2nd and 5th places)
    let current = '';
    for (let i = 1; i <= fractionalPart.length; i++) {
      current += fractionalPart[i - 1];
      if (i === 2 || i === 5) {
        if (current) {
          parts.push({ type: 'fraction', value: current });
          current = '';
        }
        parts.push({ type: 'literal', value: '\u202F' });
      }
    }
    if (current) {
      parts.push({ type: 'fraction', value: current });
    }

    return parts;
  }

  formatRange(start: number | bigint, end: number | bigint): string {
    return this.formatRangeToParts(start, end)
      .map(part => part.value)
      .join('');
  }

  // Returns format parts for a range. When start and end format to the same string,
  // returns the formatted parts for the value marked as source: 'shared', with an
  // optional approximatelySign determined by locale-native behavior
  formatRangeToParts(
    start: number | bigint,
    end: number | bigint,
  ): Intl.NumberRangeFormatPart[] {
    const formattedStart = this.format(Number(start));
    const formattedEnd = this.format(Number(end));

    // If both values format to the same string, use native formatter to detect
    // locale-specific approximation sign behavior
    if (formattedStart === formattedEnd) {
      // Use native Intl.NumberFormat to determine if locale uses approximatelySign
      const nativeFormatter = new Intl.NumberFormat(this.locale);
      let approximatelySignPart: Intl.NumberRangeFormatPart | null = null;

      // Check if native formatter supports formatRangeToParts and uses approximatelySign
      if (typeof nativeFormatter.formatRangeToParts === 'function') {
        const nativeParts = nativeFormatter.formatRangeToParts(
          Number(start),
          Number(start),
        );
        // TypeScript types may not include 'approximatelySign', so check dynamically
        const approxPart = nativeParts.find(
          p => (p as { type: string }).type === 'approximatelySign',
        );
        if (approxPart) {
          approximatelySignPart = {
            type: (approxPart as { type: string }).type,
            value: approxPart.value,
            source: 'shared',
          } as unknown as Intl.NumberRangeFormatPart;
        }
      }

      const sharedParts = this.formatToParts(start).map(part => ({
        ...part,
        source: 'shared' as const,
      })) as Intl.NumberRangeFormatPart[];

      // Prepend approximatelySign if locale uses it
      return approximatelySignPart
        ? [approximatelySignPart, ...sharedParts]
        : sharedParts;
    }

    const startParts = this.formatToParts(start).map(part => ({
      ...part,
      source: 'startRange' as const,
    }));
    const endParts = this.formatToParts(end).map(part => ({
      ...part,
      source: 'endRange' as const,
    }));

    return [
      ...startParts,
      { type: 'literal', value: '–', source: 'shared' },
      ...endParts,
    ] as Intl.NumberRangeFormatPart[];
  }

  resolvedOptions(): Intl.ResolvedNumberFormatOptions {
    return {
      locale: this.locale,
      numberingSystem: 'latn',
      style: 'decimal',
      minimumIntegerDigits: 1,
      minimumFractionDigits: this.hideFraction ? 0 : 8,
      maximumFractionDigits: this.hideFraction ? 0 : 8,
      useGrouping: 'auto',
      notation: 'standard',
      signDisplay: 'auto',
      roundingMode: 'halfExpand',
      roundingPriority: 'auto',
      trailingZeroDisplay: 'auto',
      roundingIncrement: 1,
    };
  }
}

export function getNumberFormat({
  format = numberFormatConfig.format,
  hideFraction = numberFormatConfig.hideFraction,
  decimalPlaces,
}: {
  format?: NumberFormats;
  hideFraction?: boolean;
  decimalPlaces?: number;
} = numberFormatConfig) {
  let locale, thousandsSeparator, decimalSeparator;

  const currentFormat = format || numberFormatConfig.format;
  const currentHideFraction =
    typeof hideFraction === 'boolean'
      ? hideFraction
      : numberFormatConfig.hideFraction;

  switch (format) {
    case 'space-comma':
      locale = 'fr-FR';
      thousandsSeparator = '\u202F';
      decimalSeparator = ',';
      break;
    case 'dot-comma':
      locale = 'de-DE';
      thousandsSeparator = '.';
      decimalSeparator = ',';
      break;
    case 'apostrophe-dot':
      locale = 'de-CH';
      thousandsSeparator = "'";
      decimalSeparator = '.';
      break;
    case 'comma-dot-in':
      locale = 'en-IN';
      thousandsSeparator = ',';
      decimalSeparator = '.';
      break;
    case 'sat-comma':
      locale = 'en-US';
      thousandsSeparator = ',';
      decimalSeparator = '.';
      break;
    case 'comma-dot':
    default:
      locale = 'en-US';
      thousandsSeparator = ',';
      decimalSeparator = '.';
  }

  const fractionDigitsOptions: {
    minimumFractionDigits: number;
    maximumFractionDigits: number;
  } =
    typeof decimalPlaces === 'number'
      ? {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }
      : {
          minimumFractionDigits: currentHideFraction ? 0 : 2,
          maximumFractionDigits: currentHideFraction ? 0 : 2,
        };

  // For sat-comma format, use custom SatNumberFormat that properly handles Bitcoin/Satoshi formatting
  let formatter: Intl.NumberFormat;
  if (currentFormat === 'sat-comma') {
    formatter = new SatNumberFormat(locale, currentHideFraction);
  } else {
    const intlFormatter = new Intl.NumberFormat(locale, fractionDigitsOptions);

    // Wrapper to handle -0 edge case
    formatter = {
      format: (value: number) => {
        const formatted = intlFormatter.format(value);
        return formatted === '-0' ? '0' : formatted;
      },
    } as Intl.NumberFormat;
  }

  return {
    value: currentFormat,
    thousandsSeparator,
    decimalSeparator,
    formatter,
    hideFraction: currentHideFraction,
  };
}

// Number utilities

/**
 * The exact amount.
 */
export type Amount = number;
/**
 * The exact amount that is formatted based on the configured number format.
 * For example, 123.45 would be '123.45' or '123,45'.
 */
export type FormattedAmount = string;
/**
 * The amount with the decimal point removed.
 * For example, 123.45 would be 12345.
 */
export type IntegerAmount = number;

/**
 * Combines a Currency and an IntegerAmount to represent
 * a monetary value in a specific currency.
 */
export type CurrencyAmount = {
  currency: Currency;
  amount: IntegerAmount;
};

// We dont use `Number.MAX_SAFE_NUMBER` and such here because those
// numbers are so large that it's not safe to convert them to floats
// (i.e. N / 100). For example, `9007199254740987 / 100 ===
// 90071992547409.88`. While the internal arithemetic would be correct
// because we always do that on numbers, the app would potentially
// display wrong numbers. Instead of `2**53` we use `2**51` which
// gives division more room to be correct
const MAX_SAFE_NUMBER = 2 ** 51 - 1;
const MIN_SAFE_NUMBER = -MAX_SAFE_NUMBER;

export function safeNumber(value: number) {
  if (!Number.isInteger(value)) {
    throw new Error(
      'safeNumber: number is not an integer: ' + JSON.stringify(value),
    );
  }
  if (value > MAX_SAFE_NUMBER || value < MIN_SAFE_NUMBER) {
    throw new Error(
      "safeNumber: can't safely perform arithmetic with number: " + value,
    );
  }
  return value;
}

export function toRelaxedNumber(
  formattedAmount: FormattedAmount,
  decimalPlaces?: number,
): Amount {
  return integerToAmount(
    formattedToInteger(formattedAmount, decimalPlaces) || 0,
    decimalPlaces,
  );
}

export function integerToFormatted(
  integerAmount: IntegerAmount,
  formatter:
    | Intl.NumberFormat
    | { format: (value: number) => string } = getNumberFormat().formatter,
  decimalPlaces: number = 2,
  formatConfig?: ReturnType<typeof getNumberFormat>,
) {
  // If using SatNumberFormat, we need 8 decimal places
  if (formatter instanceof SatNumberFormat) {
    decimalPlaces = 8;
  }
  const divisor = Math.pow(10, decimalPlaces);
  const amount = safeNumber(integerAmount) / divisor;
  const config = formatConfig || getNumberFormat();

  // If formatter is not provided and decimalPlaces differs from default,
  // create a formatter with the correct decimal places
  let fmt = formatter;
  if (!fmt) {
    if (decimalPlaces !== 2) {
      fmt = getNumberFormat({
        format: config.value,
        hideFraction: config.hideFraction,
        decimalPlaces,
      }).formatter;
    } else {
      fmt = config.formatter;
    }
  }

  return fmt.format(amount);
}

export function integerToFormattedWithDecimal(
  integerAmount: IntegerAmount,
  formatter = getNumberFormat().formatter,
  decimalPlaces: number = 2,
) {
  if (formatter instanceof SatNumberFormat) {
    decimalPlaces = 8;
  }
  // If decimal digits exist, keep them. Otherwise format them as usual.
  const divisor = Math.pow(10, decimalPlaces);
  if (integerAmount % divisor !== 0) {
    return integerToFormatted(
      integerAmount,
      getNumberFormat({
        ...numberFormatConfig,
        hideFraction: false,
        decimalPlaces,
      }).formatter,
      decimalPlaces,
    );
  }

  return integerToFormatted(integerAmount, formatter, decimalPlaces);
}

export function amountToFormatted(
  amount: Amount,
  formatConfig?: ReturnType<typeof getNumberFormat>,
  decimalPlaces?: number,
): FormattedAmount {
  // If decimalPlaces is provided and different from config, create a new formatter
  if (decimalPlaces !== undefined && formatConfig === undefined) {
    formatConfig = getNumberFormat({ decimalPlaces });
  } else if (decimalPlaces !== undefined && formatConfig !== undefined) {
    // If both are provided, create a new formatter with the specified decimal places
    formatConfig = getNumberFormat({
      format: formatConfig.value,
      hideFraction: formatConfig.hideFraction,
      decimalPlaces,
    });
  }

  const config = formatConfig || getNumberFormat();

  return config.formatter.format(amount);
}

export function amountToFormattedNoDecimal(amount: Amount): FormattedAmount {
  return getNumberFormat({
    ...numberFormatConfig,
    hideFraction: true,
  }).formatter.format(amount);
}

export function formattedToAmount(formattedAmount: string): Amount | null {
  formattedAmount = formattedAmount.replace(/\u2212/g, '-');

  // Then, remove Unicode directional formatting characters that can be added by currency formatting
  // This includes RLM (U+200F), LRM (U+200E), and other bidirectional control characters
  formattedAmount = formattedAmount.replace(
    /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
    '',
  );

  let integer, fraction;

  // match the last dot or comma in the string
  const match = formattedAmount.match(/[,.](?=[^.,]*$)/);

  if (
    !match ||
    (match[0] === getNumberFormat().thousandsSeparator &&
      match.index + 4 <= formattedAmount.length)
  ) {
    fraction = null;
    integer = formattedAmount.replace(/[^\d-]/g, '');
  } else {
    integer = formattedAmount.slice(0, match.index).replace(/[^\d-]/g, '');
    // Strip all non-digit characters from fraction (including U+202F and other literals)
    // to preserve satoshi precision in formats like sat-comma
    fraction = formattedAmount.slice(match.index + 1).replace(/[^\d]/g, '');
  }

  const amount = parseFloat(integer + '.' + fraction);
  return isNaN(amount) ? null : amount;
}

export function formattedToInteger(
  formattedAmount: FormattedAmount,
  decimalPlaces?: number,
): IntegerAmount | null {
  const amount = formattedToAmount(formattedAmount);
  return amount == null ? null : amountToInteger(amount, decimalPlaces);
}

export function stringToInteger(str: string): number | null {
  const amount = parseInt(
    str.replace(/\u2212/g, '-').replace(/[^-0-9.,]/g, ''),
  );
  if (!isNaN(amount)) {
    return amount;
  }
  return null;
}

export function amountToInteger(
  amount: Amount,
  decimalPlaces: number = 2,
): IntegerAmount {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(amount * multiplier);
}

export function integerToAmount(
  integerAmount: IntegerAmount,
  decimalPlaces: number = 2,
): Amount {
  const divisor = Math.pow(10, decimalPlaces);
  return integerAmount / divisor;
}

// This is used when the input format could be anything (from
// financial files and we don't want to parse based on the user's
// number format, because the user could be importing from many
// currencies. We extract out the numbers and just ignore separators.
export function looselyParseAmount(amount: string) {
  function safeNumber(v: number): null | number {
    if (isNaN(v)) {
      return null;
    }

    const value = v * 100;
    if (value > MAX_SAFE_NUMBER || value < MIN_SAFE_NUMBER) {
      return null;
    }

    return v;
  }

  function extractNumbers(v: string): string {
    return v.replace(/[^0-9-]/g, '');
  }

  if (amount.startsWith('(') && amount.endsWith(')')) {
    // Remove Unicode minus inside parentheses before converting to ASCII minus
    amount = amount.replace(/\u2212/g, '');
    amount = amount.replace('(', '-').replace(')', '');
  } else {
    // Replace Unicode minus with ASCII minus for non-parenthesized amounts
    amount = amount.replace(/\u2212/g, '-');
  }

  // Look for a decimal marker, then look for either 1-2 or 4-9 decimal places.
  // This avoids matching against 3 places which may not actually be decimal
  const m = amount.match(/[.,]([^.,]{4,9}|[^.,]{1,2})$/);
  if (!m || m.index === undefined) {
    return safeNumber(parseFloat(extractNumbers(amount)));
  }

  const left = extractNumbers(amount.slice(0, m.index));
  const right = extractNumbers(amount.slice(m.index + 1));

  return safeNumber(parseFloat(left + '.' + right));
}

export function sortByKey<T>(arr: T[], key: keyof T): T[] {
  return [...arr].sort((item1, item2) => {
    if (item1[key] < item2[key]) {
      return -1;
    } else if (item1[key] > item2[key]) {
      return 1;
    }
    return 0;
  });
}

// Date utilities

export function tsToRelativeTime(
  ts: string | null,
  locale: Locale,
  options: {
    capitalize: boolean;
  } = { capitalize: false },
): string {
  if (!ts) return 'Unknown';

  const parsed = new Date(parseInt(ts, 10));

  let distance = formatDistanceToNow(parsed, { addSuffix: true, locale });

  if (options.capitalize) {
    distance = distance.charAt(0).toUpperCase() + distance.slice(1);
  }

  return distance;
}

export function applyFindReplace(
  text: string | null | undefined,
  find: string,
  replace: string,
  useRegex: boolean,
): string {
  if (find === '') return text ?? '';
  if (!text) return '';

  try {
    const pattern = useRegex ? new RegExp(find, 'g') : find;
    return text.replaceAll(pattern, replace);
  } catch {
    return text;
  }
}

/**
 * Formats a CurrencyAmount using the specific currency's formatting rules.
 * This is useful when you need to display amounts in different currencies
 * (e.g., account balances when accounts have different currency codes).
 *
 * @param currencyAmount - Object containing the currency and integer amount
 * @param options - Optional formatting options to override currency defaults
 * @returns Formatted string with appropriate currency symbol and number format
 *
 * @example
 * const amount = { currency: getCurrency('USD'), amount: 12345 };
 * currencyToCurrency(amount) // Returns '$123.45'
 *
 * const euroAmount = { currency: getCurrency('EUR'), amount: 12345 };
 * currencyToCurrency(euroAmount) // Returns '123,45 €'
 *
 * const noSymbol = { currency: getCurrency(''), amount: 12345 };
 * currencyToCurrency(noSymbol) // Returns '123.45' (no currency symbol)
 */
export function currencyToFormatted(
  currencyAmount: CurrencyAmount,
  options?: {
    hideFraction?: boolean;
    symbolPosition?: 'before' | 'after';
    spaceEnabled?: boolean;
  },
): FormattedAmount {
  const { currency, amount } = currencyAmount;

  // Get the number formatter for this currency's format
  const formatter = getNumberFormat({
    format: currency.numberFormat,
    decimalPlaces: options?.hideFraction ? 0 : currency.decimalPlaces,
  }).formatter;

  // Format the number without currency symbol
  const formattedNumber = integerToFormatted(
    amount,
    formatter,
    currency.decimalPlaces,
  );

  // If no currency code, return just the number
  if (!currency.code || !currency.symbol) {
    return formattedNumber;
  }

  // Apply currency symbol styling
  let sign = '';
  let valueWithoutSign = formattedNumber;
  if (formattedNumber.startsWith('-')) {
    sign = '-';
    valueWithoutSign = formattedNumber.slice(1);
  }

  const space = options?.spaceEnabled ? '\u202F' : '';
  const position =
    options?.symbolPosition ?? (currency.symbolFirst ? 'before' : 'after');

  const styledAmount =
    position === 'after'
      ? `${valueWithoutSign}${space}${currency.symbol}`
      : `\u202A${currency.symbol}\u202C${space}${valueWithoutSign}`;

  return sign + styledAmount;
}

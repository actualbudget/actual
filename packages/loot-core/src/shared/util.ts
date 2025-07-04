// @ts-strict-ignore
import { type Locale, formatDistanceToNow } from 'date-fns';

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
  return amountToCurrency(currencyToAmount(result));
}

const NUMBER_FORMATS = [
  'comma-dot',
  'dot-comma',
  'space-comma',
  'apostrophe-dot',
  'comma-dot',
  'comma-dot-in',
] as const;

type NumberFormats = (typeof NUMBER_FORMATS)[number];

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
  { value: 'space-comma', label: '1\xa0000,33', labelNoFraction: '1\xa0000' },
  { value: 'apostrophe-dot', label: '1’000.33', labelNoFraction: '1’000' },
  { value: 'comma-dot-in', label: '1,00,000.33', labelNoFraction: '1,00,000' },
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
      locale = 'en-SE';
      thousandsSeparator = '\xa0';
      decimalSeparator = ',';
      break;
    case 'dot-comma':
      locale = 'de-DE';
      thousandsSeparator = '.';
      decimalSeparator = ',';
      break;
    case 'apostrophe-dot':
      locale = 'de-CH';
      thousandsSeparator = '’';
      decimalSeparator = '.';
      break;
    case 'comma-dot-in':
      locale = 'en-IN';
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

  return {
    value: currentFormat,
    thousandsSeparator,
    decimalSeparator,
    formatter: new Intl.NumberFormat(locale, fractionDigitsOptions),
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
export type CurrencyAmount = string;
/**
 * The amount with the decimal point removed.
 * For example, 123.45 would be 12345.
 */
export type IntegerAmount = number;

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
      'safeNumber: can’t safely perform arithmetic with number: ' + value,
    );
  }
  return value;
}

export function toRelaxedNumber(currencyAmount: CurrencyAmount): Amount {
  return integerToAmount(currencyToInteger(currencyAmount) || 0);
}

export function integerToCurrency(
  integerAmount: IntegerAmount,
  formatter = getNumberFormat().formatter,
  decimalPlaces: number = 2,
) {
  const divisor = Math.pow(10, decimalPlaces);
  const amount = safeNumber(integerAmount) / divisor;

  return formatter.format(amount);
}

export function amountToCurrency(amount: Amount): CurrencyAmount {
  return getNumberFormat().formatter.format(amount);
}

export function amountToCurrencyNoDecimal(amount: Amount): CurrencyAmount {
  return getNumberFormat({
    ...numberFormatConfig,
    hideFraction: true,
  }).formatter.format(amount);
}

export function currencyToAmount(currencyAmount: string): Amount | null {
  let integer, fraction;

  // match the last dot or comma in the string
  const match = currencyAmount.match(/[,.](?=[^.,]*$)/);

  if (
    !match ||
    (match[0] === getNumberFormat().thousandsSeparator &&
      match.index + 4 <= currencyAmount.length)
  ) {
    fraction = null;
    integer = currencyAmount.replace(/[^\d-]/g, '');
  } else {
    integer = currencyAmount.slice(0, match.index).replace(/[^\d-]/g, '');
    fraction = currencyAmount.slice(match.index + 1);
  }

  const amount = parseFloat(integer + '.' + fraction);
  return isNaN(amount) ? null : amount;
}

export function currencyToInteger(
  currencyAmount: CurrencyAmount,
): IntegerAmount | null {
  const amount = currencyToAmount(currencyAmount);
  return amount == null ? null : amountToInteger(amount);
}

export function stringToInteger(str: string): number | null {
  const amount = parseInt(str.replace(/[^-0-9.,]/g, ''));
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
    amount = amount.replace('(', '-').replace(')', '');
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

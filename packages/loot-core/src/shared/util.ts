// @ts-strict-ignore
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

export function applyChanges<T extends { id: string }>(
  changes: {
    added?: T[];
    updated?: T[];
    deleted?: T[];
  },
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

export function diffItems<T extends { id: string }>(items: T[], newItems: T[]) {
  const grouped = _groupById(items);
  const newGrouped = _groupById(newItems);
  const added: T[] = [];
  const updated: Partial<T>[] = [];

  const deleted = items
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

export function groupById<T extends { id: string }>(data: T[]) {
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

export function titleFirst(str: string) {
  return str[0].toUpperCase() + str.slice(1);
}

export function appendDecimals(
  amountText: string,
  hideDecimals = false,
): string {
  const { separator } = getNumberFormat();
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

type NumberFormats =
  | 'comma-dot'
  | 'dot-comma'
  | 'space-comma'
  | 'apostrophe-dot'
  | 'comma-dot-in';

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

export function setNumberFormat(config: typeof numberFormatConfig) {
  numberFormatConfig = config;
}

export function getNumberFormat({
  format,
  hideFraction,
}: {
  format?: NumberFormats;
  hideFraction: boolean;
} = numberFormatConfig) {
  let locale, regex, separator, separatorRegex;

  switch (format) {
    case 'space-comma':
      locale = 'en-SE';
      regex = /[^-0-9,.]/g;
      separator = ',';
      separatorRegex = /[,.]/g;
      break;
    case 'dot-comma':
      locale = 'de-DE';
      regex = /[^-0-9,]/g;
      separator = ',';
      break;
    case 'apostrophe-dot':
      locale = 'de-CH';
      regex = /[^-0-9,.]/g;
      separator = '.';
      separatorRegex = /[,.]/g;
      break;
    case 'comma-dot-in':
      locale = 'en-IN';
      regex = /[^-0-9.]/g;
      separator = '.';
      break;
    case 'comma-dot':
    default:
      locale = 'en-US';
      regex = /[^-0-9.]/g;
      separator = '.';
  }

  return {
    value: format,
    separator,
    formatter: new Intl.NumberFormat(locale, {
      minimumFractionDigits: hideFraction ? 0 : 2,
      maximumFractionDigits: hideFraction ? 0 : 2,
    }),
    regex,
    separatorRegex,
  };
}

// Number utilities

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

export function toRelaxedNumber(value: string) {
  return integerToAmount(currencyToInteger(value) || 0);
}

export function integerToCurrency(
  n: number,
  formatter = getNumberFormat().formatter,
) {
  return formatter.format(safeNumber(n) / 100);
}

export function amountToCurrency(n) {
  return getNumberFormat().formatter.format(n);
}

export function amountToCurrencyNoDecimal(n) {
  return getNumberFormat({
    ...numberFormatConfig,
    hideFraction: true,
  }).formatter.format(n);
}

export function currencyToAmount(str: string) {
  let amount;
  if (getNumberFormat().separatorRegex) {
    amount = parseFloat(
      str
        .replace(getNumberFormat().regex, '')
        .replace(getNumberFormat().separatorRegex, '.'),
    );
  } else {
    amount = parseFloat(
      str
        .replace(getNumberFormat().regex, '')
        .replace(getNumberFormat().separator, '.'),
    );
  }
  return isNaN(amount) ? null : amount;
}

export function currencyToInteger(str: string) {
  const amount = currencyToAmount(str);
  return amount == null ? null : amountToInteger(amount);
}

export function stringToInteger(str: string) {
  const amount = parseInt(str.replace(/[^-0-9.,]/g, ''));
  if (!isNaN(amount)) {
    return amount;
  }
  return null;
}

export function amountToInteger(n: number) {
  return Math.round(n * 100);
}

export function integerToAmount(n) {
  return parseFloat((safeNumber(n) / 100).toFixed(2));
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

  // Look for a decimal marker, then look for either 1-2 or 5-9 decimal places.
  // This avoids matching against 3 places which may not actually be decimal
  const m = amount.match(/[.,]([^.,]{5,9}|[^.,]{1,2})$/);
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

export function last(arr) {
  return arr[arr.length - 1];
}

export function getChangedValues(obj1, obj2) {
  // Keep the id field because this is mostly used to diff database
  // objects
  const diff = obj1.id ? { id: obj1.id } : {};
  const keys = Object.keys(obj2);
  let hasChanged = false;

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];

    if (obj1[key] !== obj2[key]) {
      diff[key] = obj2[key];
      hasChanged = true;
    }
  }

  return hasChanged ? diff : null;
}

export function hasFieldsChanged(obj1, obj2, fields) {
  let changed = false;
  for (let i = 0; i < fields.length; i++) {
    let field = fields[i];
    if (obj1[field] !== obj2[field]) {
      changed = true;
      break;
    }
  }
  return changed;
}

export function applyChanges(changes, items) {
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

export function partitionByField(data, field) {
  let res = new Map();
  for (let i = 0; i < data.length; i++) {
    let item = data[i];
    let key = item[field];

    let items = res.get(key) || [];
    items.push(item);

    res.set(key, items);
  }
  return res;
}

export function groupBy(data, field, mapper?: (v: unknown) => unknown) {
  let res = new Map();
  for (let i = 0; i < data.length; i++) {
    let item = data[i];
    let key = item[field];
    let existing = res.get(key) || [];
    res.set(key, existing.concat([mapper ? mapper(item) : data[i]]));
  }
  return res;
}

// This should replace the existing `groupById` function, since a
// `Map` is better, but we can't swap it out because `Map` has a
// different API and we need to go through and update everywhere that
// uses it.
function _groupById(data) {
  let res = new Map();
  for (let i = 0; i < data.length; i++) {
    let item = data[i];
    res.set(item.id, item);
  }
  return res;
}

export function diffItems(items, newItems) {
  let grouped = _groupById(items);
  let newGrouped = _groupById(newItems);
  let added = [];
  let updated = [];

  let deleted = items
    .filter(item => !newGrouped.has(item.id))
    .map(item => ({ id: item.id }));

  newItems.forEach(newItem => {
    let item = grouped.get(newItem.id);
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

export function groupById(data) {
  let res = {};
  for (let i = 0; i < data.length; i++) {
    let item = data[i];
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

export function fastSetMerge(set1, set2) {
  let finalSet = new Set(set1);
  let iter = set2.values();
  let value = iter.next();
  while (!value.done) {
    finalSet.add(value.value);
    value = iter.next();
  }
  return finalSet;
}

export function titleFirst(str) {
  return str[0].toUpperCase() + str.slice(1);
}

export let numberFormats = [
  { value: 'comma-dot', label: '1,000.33', labelNoFraction: '1,000' },
  { value: 'dot-comma', label: '1.000,33', labelNoFraction: '1.000' },
  { value: 'space-comma', label: '1 000,33', labelNoFraction: '1 000' },
  { value: 'space-dot', label: '1 000.33', labelNoFraction: '1 000' },
];

let numberFormat: {
  value: string | null;
  formatter: Intl.NumberFormat | null;
  regex: RegExp | null;
  separator?: string;
} = {
  value: null,
  formatter: null,
  regex: null,
};

export function setNumberFormat({ format, hideFraction }) {
  let locale, regex, separator;

  switch (format) {
    case 'space-comma':
      locale = 'en-ZA';
      regex = /[^-0-9,]/g;
      separator = ',';
      break;
    case 'dot-comma':
      locale = 'de-DE';
      regex = /[^-0-9,]/g;
      separator = ',';
      break;
    case 'space-dot':
      locale = 'dje';
      regex = /[^-0-9.]/g;
      separator = '.';
      break;
    case 'comma-dot':
    default:
      locale = 'en-US';
      regex = /[^-0-9.]/g;
      separator = '.';
  }

  numberFormat = {
    value: format,
    separator,
    formatter: new Intl.NumberFormat(locale, {
      minimumFractionDigits: hideFraction ? 0 : 2,
      maximumFractionDigits: hideFraction ? 0 : 2,
    }),
    regex,
  };
}

export function getNumberFormat() {
  return numberFormat;
}

setNumberFormat({ format: 'comma-dot', hideFraction: false });

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

export function safeNumber(value) {
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

export function toRelaxedNumber(value) {
  return integerToAmount(currencyToInteger(value) || 0);
}

export function integerToCurrency(n) {
  return numberFormat.formatter.format(safeNumber(n) / 100);
}

export function amountToCurrency(n) {
  return numberFormat.formatter.format(n);
}

export function currencyToAmount(str) {
  let amount = parseFloat(
    str.replace(numberFormat.regex, '').replace(numberFormat.separator, '.'),
  );
  return isNaN(amount) ? null : amount;
}

export function currencyToInteger(str) {
  let amount = currencyToAmount(str);
  return amount == null ? null : amountToInteger(amount);
}

export function stringToInteger(str) {
  let amount = parseInt(str.replace(/[^-0-9.,]/g, ''));
  if (!isNaN(amount)) {
    return amount;
  }
  return null;
}

export function amountToInteger(n) {
  return Math.round(n * 100);
}

export function integerToAmount(n) {
  return parseFloat((safeNumber(n) / 100).toFixed(2));
}

// This is used when the input format could be anything (from
// financial files and we don't want to parse based on the user's
// number format, because the user could be importing from many
// currencies. We extract out the numbers and just ignore separators.
export function looselyParseAmount(amount) {
  function safeNumber(v) {
    return isNaN(v) ? null : v;
  }

  function extractNumbers(v) {
    return v.replace(/[^0-9-]/g, '');
  }

  if (amount.startsWith('(') && amount.endsWith(')')) {
    amount = amount.replace('(', '-').replace(')', '');
  }

  let m = amount.match(/[.,][^.,]*$/);
  if (!m || m.index === 0) {
    return safeNumber(parseFloat(extractNumbers(amount)));
  }

  let left = extractNumbers(amount.slice(0, m.index));
  let right = extractNumbers(amount.slice(m.index + 1));

  return safeNumber(parseFloat(left + '.' + right));
}

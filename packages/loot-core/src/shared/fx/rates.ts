import type { ExchangeRateEntity } from '#types/models';

export type RateRecord = Pick<
  ExchangeRateEntity,
  | 'id'
  | 'from_currency'
  | 'to_currency'
  | 'rate'
  | 'date'
  | 'source'
  | 'created_at'
>;

export type RateIndex = {
  // Entries per `from>to` pair, one per date, sorted by ascending date
  pairs: Map<string, RateRecord[]>;
  currencies: Set<string>;
  // The currencies each currency has rates with, in either direction, in
  // alphabetical order: the intermediates a cross rate can go through
  neighbors: Map<string, Set<string>>;
};

export type RateLookup = {
  rate: number;
  // Date of the rate that was used, or null for identity conversions.
  // For cross rates this is the older of the two legs.
  date: string | null;
  path: 'identity' | 'direct' | 'inverse' | 'cross';
  // True when no rate on or before the requested date existed and a
  // later rate was used instead
  isFallback: boolean;
};

function pairKey(from: string, to: string) {
  return `${from}>${to}`;
}

// Higher wins: manual entries beat provider entries, then the most
// recently created, then the id so concurrent duplicates synced from
// different devices always resolve the same way.
export function compareRatePriority(a: RateRecord, b: RateRecord) {
  const aManual = a.source === 'manual' ? 1 : 0;
  const bManual = b.source === 'manual' ? 1 : 0;
  if (aManual !== bManual) {
    return aManual - bManual;
  }
  const aCreated = a.created_at ?? 0;
  const bCreated = b.created_at ?? 0;
  if (aCreated !== bCreated) {
    return aCreated - bCreated;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Inverses and products of extreme rates can overflow to Infinity or
// underflow to 0, so every rate a lookup returns is checked, not only the
// stored ones
function isUsableRateValue(rate: number) {
  return Number.isFinite(rate) && rate > 0;
}

function isUsableRate(record: RateRecord) {
  return (
    record.from_currency !== record.to_currency &&
    isUsableRateValue(record.rate)
  );
}

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function addNeighbor(
  neighbors: Map<string, string[]>,
  currency: string,
  neighbor: string,
) {
  const list = neighbors.get(currency);
  if (!list) {
    neighbors.set(currency, [neighbor]);
  } else if (!list.includes(neighbor)) {
    list.push(neighbor);
  }
}

export function buildRateIndex(records: readonly RateRecord[]): RateIndex {
  const byPairAndDate = new Map<string, Map<string, RateRecord>>();
  const currencies = new Set<string>();
  const neighborLists = new Map<string, string[]>();

  for (const record of records) {
    if (!isUsableRate(record)) {
      continue;
    }
    const key = pairKey(record.from_currency, record.to_currency);
    let byDate = byPairAndDate.get(key);
    if (!byDate) {
      byDate = new Map();
      byPairAndDate.set(key, byDate);
      addNeighbor(neighborLists, record.from_currency, record.to_currency);
      addNeighbor(neighborLists, record.to_currency, record.from_currency);
    }
    const existing = byDate.get(record.date);
    if (!existing || compareRatePriority(record, existing) > 0) {
      byDate.set(record.date, record);
    }
    currencies.add(record.from_currency);
    currencies.add(record.to_currency);
  }

  const pairs = new Map<string, RateRecord[]>();
  for (const [key, byDate] of byPairAndDate) {
    pairs.set(
      key,
      [...byDate.values()].sort((a, b) => compareText(a.date, b.date)),
    );
  }

  const neighbors = new Map<string, Set<string>>();
  for (const [currency, list] of neighborLists) {
    neighbors.set(currency, new Set(list.sort(compareText)));
  }

  return { pairs, currencies, neighbors };
}

type PairMatch = { record: RateRecord; isFallback: boolean };

function findPairRecord(
  index: RateIndex,
  from: string,
  to: string,
  date: string | undefined,
): PairMatch | null {
  const entries = index.pairs.get(pairKey(from, to));
  if (!entries || entries.length === 0) {
    return null;
  }
  if (date === undefined) {
    return { record: entries[entries.length - 1], isFallback: false };
  }

  let low = 0;
  let high = entries.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (entries[mid].date <= date) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (found === -1) {
    return { record: entries[0], isFallback: true };
  }
  return { record: entries[found], isFallback: false };
}

// A rate found for a pair, directly or through an intermediate currency
type Route = {
  rate: number;
  path: 'direct' | 'inverse' | 'cross';
  isFallback: boolean;
  // Dates of the oldest and newest rates used; the same unless crossing
  oldestDate: string;
  newestDate: string;
};

// Negative when `a` is closer to the requested date than `b`. Rates on or
// before the date beat later ones. Among those, the most recent wins,
// judged by the older leg of a cross rate and then by its newer one; among
// later ones, the earliest wins, judged by the newer leg and then by the
// older one.
function compareFreshness(a: Route, b: Route) {
  if (a.isFallback !== b.isFallback) {
    return a.isFallback ? 1 : -1;
  }
  if (a.isFallback) {
    return (
      compareText(a.newestDate, b.newestDate) ||
      compareText(b.oldestDate, a.oldestDate)
    );
  }
  return (
    compareText(b.oldestDate, a.oldestDate) ||
    compareText(b.newestDate, a.newestDate)
  );
}

function toRoute(
  match: PairMatch,
  rate: number,
  path: 'direct' | 'inverse',
): Route | null {
  if (!isUsableRateValue(rate)) {
    return null;
  }
  return {
    rate,
    path,
    isFallback: match.isFallback,
    oldestDate: match.record.date,
    newestDate: match.record.date,
  };
}

// The fresher of the direct and inverse rates. On a tie a rate the user
// entered beats a fetched one, whatever its direction; otherwise the
// direct one wins.
function findDirectOrInverse(
  index: RateIndex,
  from: string,
  to: string,
  date: string | undefined,
): Route | null {
  const directMatch = findPairRecord(index, from, to, date);
  const inverseMatch = findPairRecord(index, to, from, date);
  const direct =
    directMatch && toRoute(directMatch, directMatch.record.rate, 'direct');
  const inverse =
    inverseMatch &&
    toRoute(inverseMatch, 1 / inverseMatch.record.rate, 'inverse');

  if (!direct || !inverse) {
    return direct || inverse;
  }
  const freshness = compareFreshness(inverse, direct);
  if (freshness !== 0) {
    return freshness < 0 ? inverse : direct;
  }
  const isInverseManual = inverseMatch?.record.source === 'manual';
  const isDirectManual = directMatch?.record.source === 'manual';
  return isInverseManual && !isDirectManual ? inverse : direct;
}

// The freshest route through one intermediate currency, then the first of
// `preferredIntermediates`, then the first in alphabetical order
function findCrossRate(
  index: RateIndex,
  from: string,
  to: string,
  date: string | undefined,
  preferredIntermediates: readonly string[],
): Route | null {
  const fromNeighbors = index.neighbors.get(from);
  const toNeighbors = index.neighbors.get(to);
  if (!fromNeighbors || !toNeighbors) {
    return null;
  }

  let best: Route | null = null;
  let bestPreference = Infinity;
  for (const via of fromNeighbors) {
    if (via === to || !toNeighbors.has(via)) {
      continue;
    }
    const first = findDirectOrInverse(index, from, via, date);
    const second = first && findDirectOrInverse(index, via, to, date);
    if (!first || !second) {
      continue;
    }
    const rate = first.rate * second.rate;
    if (!isUsableRateValue(rate)) {
      continue;
    }

    const route: Route = {
      rate,
      path: 'cross',
      isFallback: first.isFallback || second.isFallback,
      oldestDate:
        first.oldestDate < second.oldestDate
          ? first.oldestDate
          : second.oldestDate,
      newestDate:
        first.newestDate > second.newestDate
          ? first.newestDate
          : second.newestDate,
    };
    const preferenceIndex = preferredIntermediates.indexOf(via);
    const preference = preferenceIndex === -1 ? Infinity : preferenceIndex;
    const comparison = best ? compareFreshness(route, best) : -1;
    if (comparison < 0 || (comparison === 0 && preference < bestPreference)) {
      best = route;
      bestPreference = preference;
    }
  }
  return best;
}

function toLookup(route: Route): RateLookup {
  return {
    rate: route.rate,
    date: route.oldestDate,
    path: route.path,
    isFallback: route.isFallback,
  };
}

// Finds the rate to convert `from` into `to` on `date` (the latest rate
// when omitted), trying in order:
//
// 1. the direct or inverse rate on or before the date;
// 2. a cross rate through one intermediate currency with both legs on or
//    before the date;
// 3. the direct or inverse rate after the date;
// 4. a cross rate with a leg after the date.
//
// Of the direct and inverse rates, the one closest to the date wins; on a
// tie a rate the user entered beats a fetched one, then the direct one
// wins. Of several cross rates, the freshest wins (see `compareFreshness`),
// then the first of `preferredIntermediates`, then the intermediate first
// in alphabetical order. Rates that aren't finite and positive, such as the
// inverse of a tiny rate, are skipped.
export function findRate(
  index: RateIndex,
  from: string,
  to: string,
  date?: string,
  {
    preferredIntermediates = [],
  }: { preferredIntermediates?: readonly string[] } = {},
): RateLookup | null {
  if (from === to) {
    return { rate: 1, date: null, path: 'identity', isFallback: false };
  }

  const single = findDirectOrInverse(index, from, to, date);
  if (single && !single.isFallback) {
    return toLookup(single);
  }

  const cross = findCrossRate(index, from, to, date, preferredIntermediates);
  if (single && (!cross || cross.isFallback)) {
    return toLookup(single);
  }
  return cross && toLookup(cross);
}

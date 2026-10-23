import * as db from '#server/db';
import { exchangeRateModel } from '#server/models';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';
import {
  getSqlDefaultCurrencyCode,
  isSqlConversionEnabled,
} from '#shared/fx/sql';
import { isWebAddress } from '#shared/fx/webAddress';
import * as monthUtils from '#shared/months';
import type { ExchangeRateEntity } from '#types/models';

import {
  DEFAULT_FRANKFURTER_URL,
  fetchFrankfurterCurrencies,
  fetchFrankfurterRates,
  FRANKFURTER_SOURCE,
} from './providers/frankfurter';
import type {
  FetchFn,
  FrankfurterCoverage,
  FrankfurterRate,
} from './providers/frankfurter';
import { getExchangeRates, upsertExchangeRates } from './store';
import type { ExchangeRatesUpsertResult, ValidExchangeRate } from './store';

export type ExchangeRatesUpdateResult = ExchangeRatesUpsertResult & {
  // Currencies of accounts the provider has no rates for
  unsupported: string[];
  // Why some or all rates couldn't be fetched
  errors: string[];
};

// Rates older than this many days are fetched as one average rate a month,
// dated its first day, rather than every day, so a first update over years
// of history stays small to sync. Lookups use the rate on or before each
// date, so a month's amounts use its average.
const DAILY_HISTORY_DAYS = 365;

// A day without a rate from the provider counts as one it doesn't have
// (e.g. a holiday) once it is this many days old; more recent rates may
// just not be published yet
const SETTLED_DAYS = 3;

// An update gives up after this long, so a server that stopped answering
// doesn't hold up closing the budget, which waits for it
const UPDATE_TIMEOUT_MS = 60_000;

type ProviderGaps = Record<string, string[]>;

function loadProviderGaps(): ProviderGaps {
  try {
    const parsed: unknown = JSON.parse(
      prefs.getPrefs()?.exchangeRatesProviderGaps ?? '{}',
    );
    const gaps: ProviderGaps = {};
    if (typeof parsed === 'object' && parsed !== null) {
      for (const [currency, dates] of Object.entries(parsed)) {
        if (Array.isArray(dates)) {
          gaps[currency] = dates.filter(
            (date): date is string => typeof date === 'string',
          );
        }
      }
    }
    return gaps;
  } catch {
    return {};
  }
}

type Direction = 'forward' | 'reverse';

async function getProviderUrl(): Promise<string> {
  const row = await db.first<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    ['exchange-rates-provider-url'],
  );
  return row?.value?.trim() || DEFAULT_FRANKFURTER_URL;
}

// Currencies of accounts (closed ones too, for their history) other than
// the default currency
async function getAccountCurrencies(defaultCurrency: string) {
  const rows = await db.all<Pick<db.DbAccount, 'currency'>>(
    'SELECT DISTINCT currency FROM accounts WHERE tombstone = 0 AND currency IS NOT NULL',
  );
  return rows
    .map(row => row.currency)
    .filter(
      (currency): currency is string =>
        typeof currency === 'string' &&
        currency !== '' &&
        currency !== defaultCurrency,
    )
    .sort();
}

async function getFirstTransactionDate(
  currency: string,
): Promise<string | null> {
  const row = await db.first<{ date: number | null }>(
    `SELECT MIN(t.date) AS date FROM transactions t
       JOIN accounts a ON a.id = t.acct
       WHERE t.tombstone = 0 AND a.tombstone = 0 AND a.currency = ?`,
    [currency],
  );
  return row?.date ? db.fromDateRepr(row.date) : null;
}

// A pair keeps the direction its first rate was entered in, as the
// Exchange Rates page shows it; new pairs are stored as "1 USD = … CAD"
function getDirection(
  rates: readonly ExchangeRateEntity[],
  currency: string,
  defaultCurrency: string,
): Direction {
  const isReversed = (rate: ExchangeRateEntity) =>
    rate.from_currency === defaultCurrency && rate.to_currency === currency;
  const isForward = (rate: ExchangeRateEntity) =>
    rate.from_currency === currency && rate.to_currency === defaultCurrency;
  const isEarlier = (rate: ExchangeRateEntity, other: ExchangeRateEntity) => {
    const created = rate.created_at ?? Infinity;
    const otherCreated = other.created_at ?? Infinity;
    return created !== otherCreated
      ? created < otherCreated
      : rate.date < other.date;
  };
  let first: ExchangeRateEntity | null = null;
  for (const rate of rates) {
    if (
      (isForward(rate) || isReversed(rate)) &&
      (!first || isEarlier(rate, first))
    ) {
      first = rate;
    }
  }
  return first && isReversed(first) ? 'reverse' : 'forward';
}

type DateRange = { startDate: string; endDate: string };
type FetchRange = DateRange & { group?: 'month' };

type PairDates = {
  // Dates and months (YYYY-MM) the pair has a rate on, from any source
  dates: Set<string>;
  months: Set<string>;
  // Days the provider has no rate for
  gaps: Set<string>;
  hasFetched: boolean;
  oldestFetched: string | null;
  newestFetched: string | null;
};

function getPairDates(
  rates: readonly ExchangeRateEntity[],
  currency: string,
  defaultCurrency: string,
  gaps: readonly string[] = [],
): PairDates {
  const pair: PairDates = {
    dates: new Set(),
    months: new Set(),
    gaps: new Set(gaps),
    hasFetched: false,
    oldestFetched: null,
    newestFetched: null,
  };
  for (const rate of rates) {
    const isPair =
      (rate.from_currency === currency &&
        rate.to_currency === defaultCurrency) ||
      (rate.from_currency === defaultCurrency && rate.to_currency === currency);
    if (!isPair) {
      continue;
    }
    pair.dates.add(rate.date);
    pair.months.add(rate.date.slice(0, 7));
    if (rate.source === FRANKFURTER_SOURCE) {
      pair.hasFetched = true;
      if (pair.oldestFetched === null || rate.date < pair.oldestFetched) {
        pair.oldestFetched = rate.date;
      }
      if (pair.newestFetched === null || rate.date > pair.newestFetched) {
        pair.newestFetched = rate.date;
      }
    }
  }
  return pair;
}

// The dates of a fetched series without a rate between `startDate` and
// `endDate`: a month before `dailyFrom` counts as covered by any rate in
// it, a day from it on only by a rate on that day. Neighbouring dates are
// merged into ranges.
function findHoles(
  pair: PairDates,
  startDate: string,
  endDate: string,
  dailyFrom: string,
): DateRange[] {
  const holes: DateRange[] = [];
  const add = (start: string, end: string) => {
    const last = holes.at(-1);
    if (last && monthUtils.addDays(last.endDate, 1) === start) {
      last.endDate = end;
    } else {
      holes.push({ startDate: start, endDate: end });
    }
  };

  if (startDate < dailyFrom) {
    const monthlyEnd = monthUtils.subDays(dailyFrom, 1);
    const end = endDate < monthlyEnd ? endDate : monthlyEnd;
    for (
      let month = monthUtils.monthFromDate(startDate);
      month <= monthUtils.monthFromDate(end);
      month = monthUtils.addMonths(month, 1)
    ) {
      if (!pair.months.has(month)) {
        const first = `${month}-01`;
        const last = monthUtils.lastDayOfMonth(first);
        add(first < startDate ? startDate : first, last < end ? last : end);
      }
    }
  }
  for (
    let day = startDate < dailyFrom ? dailyFrom : startDate;
    day <= endDate;
    day = monthUtils.addDays(day, 1)
  ) {
    if (!pair.dates.has(day) && !pair.gaps.has(day)) {
      add(day, day);
    }
  }
  return holes;
}

// The days the pair is missing, from its first transaction (or today
// without any) up to today, within the days the provider has rates for
// both currencies: days the app wasn't opened, transactions added with an
// older date, and rates deleted in between. Rates the user entered count
// as present.
async function getMissingRanges(
  pair: PairDates,
  currency: string,
  today: string,
  dailyFrom: string,
  coverages: ReadonlyArray<FrankfurterCoverage | undefined>,
): Promise<DateRange[]> {
  const firstTransaction = await getFirstTransactionDate(currency);
  let startDate = firstTransaction ?? pair.oldestFetched ?? today;
  let endDate = today;
  for (const coverage of coverages) {
    if (coverage?.startDate && coverage.startDate > startDate) {
      startDate = coverage.startDate;
    }
    if (coverage?.endDate && coverage.endDate < endDate) {
      endDate = coverage.endDate;
    }
  }
  return findHoles(pair, startDate, endDate, dailyFrom);
}

// Without days older than daily rates are fetched for, which are never
// looked at again
function pruneProviderGaps(
  gaps: ProviderGaps,
  dailyFrom: string,
): ProviderGaps {
  const pruned: ProviderGaps = {};
  for (const [currency, dates] of Object.entries(gaps)) {
    const kept = dates.filter(date => date >= dailyFrom);
    if (kept.length > 0) {
      pruned[currency] = kept;
    }
  }
  return pruned;
}

// Splits a range into the monthly part before `dailyFrom` and the daily
// part from it on
function toFetchRanges(range: DateRange, dailyFrom: string): FetchRange[] {
  const ranges: FetchRange[] = [];
  if (range.startDate < dailyFrom) {
    const monthlyEnd = monthUtils.subDays(dailyFrom, 1);
    ranges.push({
      startDate: range.startDate,
      endDate: range.endDate < monthlyEnd ? range.endDate : monthlyEnd,
      group: 'month',
    });
  }
  if (range.endDate >= dailyFrom) {
    ranges.push({
      startDate: range.startDate < dailyFrom ? dailyFrom : range.startDate,
      endDate: range.endDate,
    });
  }
  return ranges;
}

// The provider is asked with the default currency as the base, which keeps
// its full precision for currencies worth much less (1 CAD = 2333.81 COP
// rather than 1 COP = 0.00044 CAD)
function toStoredRates(
  fetched: readonly FrankfurterRate[],
  currency: string,
  defaultCurrency: string,
  direction: Direction,
): ValidExchangeRate[] {
  const rates: ValidExchangeRate[] = [];
  for (const { date, rate } of fetched) {
    const stored =
      direction === 'reverse'
        ? { from_currency: defaultCurrency, to_currency: currency, rate }
        : {
            from_currency: currency,
            to_currency: defaultCurrency,
            rate: Number((1 / rate).toPrecision(10)),
          };
    try {
      rates.push(exchangeRateModel.validate({ ...stored, date }));
    } catch {
      // A rate out of the accepted range is left out
    }
  }
  return rates;
}

// Fetches the rates every currency in use is missing, up to today, and
// saves them as fetched rates: rates the user entered are never replaced
// and always win. Requests run outside the mutator queue, so editing the
// budget isn't held up; only saving the rates is queued, and skipped when
// another budget was opened in the meantime.
export async function updateExchangeRates({
  fetchFn,
}: { fetchFn?: FetchFn } = {}): Promise<ExchangeRatesUpdateResult> {
  const result: ExchangeRatesUpdateResult = {
    added: 0,
    updated: 0,
    unchanged: 0,
    unsupported: [],
    errors: [],
  };
  if (!isSqlConversionEnabled()) {
    result.errors.push('Multiple currencies are not enabled');
    return result;
  }

  const budgetId = prefs.getPrefs()?.id;
  const defaultCurrency = getSqlDefaultCurrencyCode();
  const currencies = await getAccountCurrencies(defaultCurrency);
  if (currencies.length === 0) {
    return result;
  }

  const baseUrl = await getProviderUrl();
  if (!isWebAddress(baseUrl)) {
    result.errors.push(
      `The Frankfurter server address isn't a web address: ${baseUrl}`,
    );
    return result;
  }
  const signal = AbortSignal.timeout(UPDATE_TIMEOUT_MS);
  let supported: Map<string, FrankfurterCoverage>;
  try {
    supported = await fetchFrankfurterCurrencies(baseUrl, fetchFn, signal);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }
  if (!supported.has(defaultCurrency)) {
    result.unsupported = [defaultCurrency];
    return result;
  }

  const savedRates = await getExchangeRates();
  const today = monthUtils.currentDay();
  const dailyFrom = monthUtils.subDays(today, DAILY_HISTORY_DAYS);
  const settledBefore = monthUtils.subDays(today, SETTLED_DAYS);
  const savedGaps = loadProviderGaps();
  const providerGaps = { ...savedGaps };
  const toSave: ValidExchangeRate[] = [];

  for (const currency of currencies) {
    if (!supported.has(currency)) {
      result.unsupported.push(currency);
      continue;
    }
    const pair = getPairDates(
      savedRates,
      currency,
      defaultCurrency,
      providerGaps[currency] ?? [],
    );
    const ranges = (
      await getMissingRanges(pair, currency, today, dailyFrom, [
        supported.get(currency),
        supported.get(defaultCurrency),
      ])
    )
      .filter(range => range.startDate <= range.endDate)
      .flatMap(range => toFetchRanges(range, dailyFrom));
    if (ranges.length === 0) {
      continue;
    }

    const direction = getDirection(savedRates, currency, defaultCurrency);
    try {
      for (const range of ranges) {
        const fetched = await fetchFrankfurterRates(
          {
            baseUrl,
            base: defaultCurrency,
            quote: currency,
            ...range,
            signal,
          },
          fetchFn,
        );
        toSave.push(
          ...toStoredRates(fetched, currency, defaultCurrency, direction),
        );

        // Settled days the provider answered without a rate for. Only days
        // it has later rates than, so an empty answer, e.g. from a server
        // still filling its history, isn't taken for gaps.
        if (!range.group) {
          const returned = new Set(fetched.map(rate => rate.date));
          const coveredUntil = fetched.reduce<string | null>(
            (newest, rate) =>
              newest === null || rate.date > newest ? rate.date : newest,
            pair.newestFetched,
          );
          const gaps = new Set(providerGaps[currency] ?? []);
          for (
            let day = range.startDate;
            day <= range.endDate &&
            day < settledBefore &&
            coveredUntil !== null &&
            day < coveredUntil;
            day = monthUtils.addDays(day, 1)
          ) {
            if (!returned.has(day)) {
              gaps.add(day);
            }
          }
          providerGaps[currency] = [...gaps].sort();
        }
      }
    } catch (err) {
      result.errors.push(
        `${currency}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const gaps = pruneProviderGaps(providerGaps, dailyFrom);
  const hasNewGaps = JSON.stringify(gaps) !== JSON.stringify(savedGaps);
  if (!hasNewGaps && toSave.length === 0) {
    return result;
  }
  await runMutator(async () => {
    if (prefs.getPrefs()?.id !== budgetId) {
      result.errors.push('Another budget was opened during the update');
      return;
    }
    // The gaps live in the budget's metadata, which the handler can run
    // without, e.g. right as a budget opens
    if (hasNewGaps && budgetId !== undefined) {
      await prefs.savePrefs({
        exchangeRatesProviderGaps: JSON.stringify(gaps),
      });
    }
    if (toSave.length > 0) {
      const saved = await upsertExchangeRates(toSave, FRANKFURTER_SOURCE);
      result.added = saved.added;
      result.updated = saved.updated;
      result.unchanged = saved.unchanged;
    }
  });
  return result;
}

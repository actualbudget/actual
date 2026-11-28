import * as db from '#server/db';
import { fromDateRepr, toDateRepr } from '#server/models';
import { isReviewedCurrency } from '#shared/amount-encoding';
import { addUtcDays, utcDay } from '#shared/exchange-rate';
import type { ExchangeRateEntity } from '#types/models';

import { isExactFetchedCoverage } from './app';

export type RateRange = { quoteCurrency: string; from: string; to: string };
export type RateKey = { quoteCurrency: string; date: string };

/**
 * The continuous daily history each foreign account needs: open accounts
 * from their first live transaction through today (today alone without
 * transactions), closed accounts through their last transaction, or through
 * today while they still hold a nonzero native balance. Accounts merge into
 * one set of ranges per currency; future transactions wait for their day.
 */
export async function readMissingRateRanges(
  baseCurrency: string,
  today: string,
): Promise<RateRange[]> {
  const rows = await db.all<{
    currency: string;
    closed: number;
    first: number | null;
    last: number | null;
    native: number | null;
  }>(
    `SELECT a.currency, a.closed, MIN(t.date) AS first, MAX(t.date) AS last,
            SUM(t.transaction_amount) AS native
       FROM accounts a
       LEFT JOIN transactions t ON t.acct = a.id AND t.tombstone = 0
            AND IFNULL(t.isParent, 0) = 0 AND t.date <= ?
      WHERE a.tombstone = 0 AND a.currency IS NOT NULL AND a.currency != ?
      GROUP BY a.id`,
    [toDateRepr(today), baseCurrency],
  );
  const byCurrency = new Map<string, Array<[string, string]>>();
  for (const row of rows) {
    if (!isReviewedCurrency(row.currency)) continue;
    const first = row.first == null ? null : fromDateRepr(row.first);
    const last = row.last == null ? null : fromDateRepr(row.last);
    let span: [string, string] | null = null;
    if (!row.closed) span = [first ?? today, today];
    else if (first && last) span = [first, row.native ? today : last];
    if (!span) continue;
    const spans = byCurrency.get(row.currency) ?? [];
    spans.push(span);
    byCurrency.set(row.currency, spans);
  }
  const ranges: RateRange[] = [];
  for (const [quoteCurrency, spans] of [...byCurrency].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    spans.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    let [from, to] = spans[0];
    for (const [nextFrom, nextTo] of spans.slice(1)) {
      if (nextFrom <= addUtcDays(to, 1)) {
        if (nextTo > to) to = nextTo;
      } else {
        ranges.push({ quoteCurrency, from, to });
        [from, to] = [nextFrom, nextTo];
      }
    }
    ranges.push({ quoteCurrency, from, to });
  }
  return ranges;
}

/** Exact fetched coverage per currency, indexed once for a whole run. */
export async function readFetchedDays(
  baseCurrency: string,
  source: string,
): Promise<Map<string, Set<string>>> {
  const rows = await db.all<ExchangeRateEntity>(
    `SELECT * FROM exchange_rates
      WHERE base_currency = ? AND source = ? AND kind = 'fetched'
        AND tombstone = 0`,
    [baseCurrency, source],
  );
  const days = new Map<string, Set<string>>();
  for (const row of rows) {
    const date = utcDay(row.timestamp);
    if (
      !isExactFetchedCoverage(row, {
        baseCurrency,
        quoteCurrency: row.quote_currency,
        date,
        source,
      })
    ) {
      continue;
    }
    const set = days.get(row.quote_currency) ?? new Set<string>();
    set.add(date);
    days.set(row.quote_currency, set);
  }
  return days;
}

/** Dates priced first: today, month ends and transaction dates, newest first. */
async function priorityDates(
  range: RateRange,
  today: string,
): Promise<string[]> {
  const rows = await db.all<{ date: number }>(
    `SELECT DISTINCT t.date FROM transactions t
       JOIN accounts a ON a.id = t.acct
      WHERE a.tombstone = 0 AND a.currency = ? AND t.tombstone = 0
        AND t.date >= ? AND t.date <= ?`,
    [range.quoteCurrency, toDateRepr(range.from), toDateRepr(range.to)],
  );
  const dates = new Set(rows.map(row => fromDateRepr(row.date)));
  if (range.to === today) dates.add(today);
  for (let day = range.from; day <= range.to; day = addUtcDays(day, 1)) {
    if (addUtcDays(day, 1).slice(8) === '01') dates.add(day);
  }
  return [...dates].sort((a, b) => b.localeCompare(a));
}

function* newestFirst(range: RateRange) {
  for (let day = range.to; day >= range.from; day = addUtcDays(day, -1)) {
    yield day;
  }
}

/**
 * Lazily supplies currency/date keys without exact fetched coverage or a
 * settled gap. Each tier rotates between currencies so one long history
 * cannot starve another; only the priority tier is held in memory.
 */
export async function* iterateMissingRateDates(
  ranges: RateRange[],
  fetched: Map<string, Set<string>>,
  isSettled: (key: RateKey) => boolean,
  today: string,
): AsyncGenerator<RateKey> {
  const seen = new Set<string>();
  const wanted = (key: RateKey) => {
    const id = `${key.quoteCurrency}|${key.date}`;
    if (seen.has(id) || fetched.get(key.quoteCurrency)?.has(key.date)) {
      return false;
    }
    seen.add(id);
    return !isSettled(key);
  };
  const first = await Promise.all(
    ranges.map(async range => ({
      quoteCurrency: range.quoteCurrency,
      dates: (await priorityDates(range, today))[Symbol.iterator](),
    })),
  );
  type Source = { quoteCurrency: string; dates: Iterator<string> };
  const tiers: Source[][] = [
    first,
    ranges.map(range => ({
      quoteCurrency: range.quoteCurrency,
      dates: newestFirst(range),
    })),
  ];
  for (const tier of tiers) {
    let active: Source[] = tier;
    while (active.length > 0) {
      const next: Source[] = [];
      for (const source of active) {
        const step = source.dates.next();
        if (step.done) continue;
        next.push(source);
        const key = { quoteCurrency: source.quoteCurrency, date: step.value };
        if (wanted(key)) yield key;
      }
      active = next;
    }
  }
}

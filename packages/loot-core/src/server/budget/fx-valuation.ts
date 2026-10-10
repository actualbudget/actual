import { logger } from '#platform/server/log';
import * as db from '#server/db';
import * as sheet from '#server/sheet';
import {
  getDefaultCurrencyCode,
  getRecordedAmountPrecision,
} from '#server/util/currency';
import { nativeToBase } from '#shared/exchange-rate';
import * as monthUtils from '#shared/months';
import { MAX_SAFE_NUMBER } from '#shared/util';

type RateUsed = {
  rate: string;
  kind: string;
  source: string;
  timestamp: string | null;
  fallback: boolean;
};

type UnavailableReason =
  | 'rate-unavailable'
  | 'precision-unavailable'
  | 'amount-out-of-range';

function safeAmount(value: bigint): number | null {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && Math.abs(amount) <= MAX_SAFE_NUMBER
    ? amount
    : null;
}

function sumAmounts(values: (number | null)[]) {
  if (values.some(value => value === null)) {
    return { value: null, overflow: false };
  }
  const value = safeAmount(
    values.reduce<bigint>((sum, amount) => sum + BigInt(amount!), 0n),
  );
  return { value, overflow: value === null };
}

export type FxAccountMonth = {
  account: string;
  name: string;
  currency: string;
  /** Valued holdings at the month's opening and close; null when unknown. */
  opening: number | null;
  closing: number | null;
  /** Booked base flows during the month. */
  flows: number | null;
  /** This month's reconciling change: opening + flows + posted = closing. */
  posted: number;
  /**
   * A gap already open before the first month the budget has, which no
   * earlier cell holds; it reaches To Budget with this month.
   */
  broughtForward: number | null;
  incomplete: boolean;
  /** Earlier unresolved closes whose change this month's net includes. */
  covers: string[];
  openDate: string;
  openingRate: RateUsed | null;
  closeDate: string;
  rate: RateUsed | null;
  unavailableReason: UnavailableReason | null;
};

export type FxMonth = {
  month: string;
  opening: number | null;
  closing: number | null;
  flows: number | null;
  /** Monthly FX, summed from account rows; null if the sum exceeds bounds. */
  posted: number | null;
  broughtForward: number | null;
  incomplete: boolean;
  unavailableReason: UnavailableReason | null;
  accounts: FxAccountMonth[];
};

type Close = {
  date: string;
  native: bigint;
  base: bigint;
  /** Valued holdings, or null when holdings are nonzero without a rate. */
  value: number | null;
  rate: RateUsed | null;
  unavailableReason: UnavailableReason | null;
};

/** The last day of a past month, today for the current month. */
function closeOf(month: string, today: string) {
  return month === monthUtils.monthFromDate(today)
    ? today
    : monthUtils.getMonthEnd(`${month}-01`);
}

/**
 * The monthly valuation bridge (MC-8.1) of on-budget accounts in other
 * currencies, from the first given month through the current one: each
 * month's posted FX amount is the change in the valuation gap (valued
 * holdings less booked base) since the latest close that could be valued.
 */
export async function fxValuation(
  months: string[],
  today = monthUtils.currentDay(),
): Promise<FxMonth[]> {
  const current = monthUtils.monthFromDate(today);
  const sorted = [...new Set(months)].filter(m => m <= current).sort();
  if (sorted.length === 0) return [];
  const budgetCurrency = await getDefaultCurrencyCode();
  const bp = getRecordedAmountPrecision();
  const accounts = await db.all<{
    id: string;
    name: string;
    currency: string;
    currency_precision: number | null;
  }>(
    `SELECT id, name, currency, currency_precision FROM accounts
       WHERE tombstone = 0 AND offbudget = 0 AND currency IS NOT NULL
         AND currency != ?
       ORDER BY sort_order, name`,
    [budgetCurrency],
  );
  // Loaded on use: the rates app registers handlers when imported, and the
  // budget modules that import this one load before the handler registry.
  const { resolveRate } = await import('#server/exchange-rates/app');
  const rates = new Map<string, RateUsed | null>();
  const rateOn = async (currency: string, date: string) => {
    const key = `${currency}|${date}`;
    if (!rates.has(key)) {
      const resolved = await resolveRate({
        baseCurrency: budgetCurrency,
        quoteCurrency: currency,
        date,
      });
      rates.set(
        key,
        resolved.status === 'resolved'
          ? {
              rate: resolved.rate,
              kind: resolved.kind,
              source: resolved.source,
              timestamp: resolved.timestamp,
              fallback: resolved.fallback,
            }
          : null,
      );
    }
    return rates.get(key)!;
  };

  const result: FxMonth[] = sorted.map(month => ({
    month,
    opening: 0,
    closing: 0,
    flows: 0,
    posted: 0,
    broughtForward: 0,
    incomplete: false,
    unavailableReason: null,
    accounts: [],
  }));
  const byMonth = new Map(result.map(entry => [entry.month, entry]));
  for (const account of accounts) {
    // Sum integer rows exactly, including totals outside the representable
    // range, so a later outflow can bring holdings back into range.
    const rows = await db.all<{
      date: number;
      amount: number;
      transaction_amount: number | null;
    }>(
      `SELECT date, amount, transaction_amount FROM transactions
       WHERE acct = ? AND tombstone = 0 AND isChild = 0
         AND date IS NOT NULL AND date <= ? ORDER BY date, id`,
      [account.id, db.toDateRepr(today)],
    );
    let cursor = 0;
    let native = 0n;
    let base = 0n;
    let invalidAmount = false;
    const closeAt = async (date: string): Promise<Close> => {
      const dateRepr = db.toDateRepr(date);
      while (cursor < rows.length && rows[cursor].date <= dateRepr) {
        const row = rows[cursor++];
        if (
          !Number.isSafeInteger(row.amount) ||
          !Number.isSafeInteger(row.transaction_amount ?? 0)
        ) {
          invalidAmount = true;
          continue;
        }
        native += BigInt(row.transaction_amount ?? 0);
        base += BigInt(row.amount);
      }
      const close: Close = {
        date,
        native,
        base,
        value: null,
        rate: null,
        unavailableReason: null,
      };
      if (
        invalidAmount ||
        safeAmount(base) === null ||
        safeAmount(native) === null
      ) {
        return { ...close, unavailableReason: 'amount-out-of-range' };
      }
      if (native === 0n) return { ...close, value: 0 };
      const rate = await rateOn(account.currency, date);
      const precision = account.currency_precision;
      close.rate = rate;
      if (!Number.isInteger(precision) || precision! < 0 || precision! > 15) {
        return { ...close, unavailableReason: 'precision-unavailable' };
      }
      if (!rate) return { ...close, unavailableReason: 'rate-unavailable' };
      try {
        close.value = nativeToBase(Number(native), precision!, bp, rate.rate);
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== 'amount-out-of-range'
        ) {
          throw error;
        }
        return { ...close, unavailableReason: 'amount-out-of-range' };
      }
      if (
        safeAmount(BigInt(close.value)) === null ||
        safeAmount(BigInt(close.value) - base) === null
      ) {
        return {
          ...close,
          value: null,
          unavailableReason: 'amount-out-of-range',
        };
      }
      return close;
    };
    const gap = (close: Close) =>
      close.value === null ? null : BigInt(close.value) - close.base;

    // Walk historical closes before slicing the requested range. An
    // unresolved opening must still use the last resolved historical gap.
    const first = rows[0]
      ? monthUtils.monthFromDate(db.fromDateRepr(rows[0].date))
      : sorted[0];
    const start = first < sorted[0] ? first : sorted[0];
    let previous = await closeAt(
      monthUtils.getMonthEnd(`${monthUtils.prevMonth(start)}-01`),
    );
    let lastGap = 0n;
    let pendingForward = 0n;
    let unresolved: string[] = [];
    for (const month of monthUtils.rangeInclusive(
      start,
      sorted[sorted.length - 1],
    )) {
      const entry = byMonth.get(month);
      let close = await closeAt(closeOf(month, today));
      let closeGap = gap(close);
      let posted = 0;
      let broughtForward: number | null = 0;
      let covers: string[] = [];
      if (closeGap !== null) {
        const change = safeAmount(closeGap - lastGap);
        if (change === null) {
          close = {
            ...close,
            value: null,
            unavailableReason: 'amount-out-of-range',
          };
          closeGap = null;
        } else {
          posted = change;
          covers = unresolved;
          lastGap = closeGap;
          unresolved = [];
          if (entry) {
            broughtForward = safeAmount(pendingForward);
            if (broughtForward !== null) pendingForward = 0n;
          } else {
            pendingForward += BigInt(posted);
          }
        }
      }
      if (closeGap === null) {
        unresolved = [...unresolved, close.date];
      }
      const flows = safeAmount(close.base - previous.base);
      const incomplete =
        closeGap === null || flows === null || broughtForward === null;
      if (
        entry &&
        (close.native !== 0n ||
          previous.native !== 0n ||
          flows !== 0 ||
          incomplete ||
          posted !== 0 ||
          broughtForward !== 0)
      ) {
        entry.accounts.push({
          account: account.id,
          name: account.name,
          currency: account.currency,
          opening: previous.value,
          closing: close.value,
          flows,
          posted,
          broughtForward,
          incomplete,
          covers,
          openDate: previous.date,
          openingRate: previous.rate,
          closeDate: close.date,
          rate: close.rate,
          unavailableReason:
            close.unavailableReason ??
            (flows === null || broughtForward === null
              ? 'amount-out-of-range'
              : null),
        });
      }
      if (entry) entry.incomplete ||= incomplete;
      previous = close;
    }
  }
  for (const entry of result) {
    for (const field of [
      'opening',
      'closing',
      'flows',
      'posted',
      'broughtForward',
    ] as const) {
      const sum = sumAmounts(entry.accounts.map(account => account[field]));
      entry[field] = sum.value;
      if (sum.overflow) {
        entry.incomplete = true;
        entry.unavailableReason = 'amount-out-of-range';
      }
    }
    entry.unavailableReason ??=
      entry.accounts.find(account => account.unavailableReason)
        ?.unavailableReason ?? null;
  }
  return result;
}

/**
 * Writes each created month's `fx-changes` cell from the bridge (envelope
 * budgets only); months after the current one hold 0.
 */
export async function refreshFxChanges() {
  const pass = ++refreshPass;
  const spreadsheet = sheet.get();
  if (!spreadsheet) return;
  const meta = spreadsheet.meta();
  if (meta.budgetType !== 'envelope' || !meta.createdMonths) return;
  const months = [...(meta.createdMonths as Set<string>)];
  // ponytail: a full pass over months and foreign accounts; narrow it to
  // the months after the earliest change if it measurably slows loads.
  const today = monthUtils.currentDay();
  const bridge = new Map(
    (await fxValuation(months, today)).map(entry => [
      entry.month,
      sumAmounts([entry.posted, entry.broughtForward]).value,
    ]),
  );
  if (pass !== refreshPass || sheet.get() !== spreadsheet) return;
  sheet.startTransaction();
  try {
    for (const month of months) {
      const sheetName = monthUtils.sheetForMonth(month);
      const value = bridge.has(month) ? bridge.get(month)! : 0;
      // Incomplete aggregates contribute zero on every device and reopen.
      const adjustment = value ?? 0;
      if (spreadsheet.getCellValue(sheetName, 'fx-changes') !== adjustment) {
        spreadsheet.set(`${sheetName}!fx-changes`, adjustment);
      }
    }
  } finally {
    sheet.endTransaction();
  }
  lastDay = today;
  if (monthUtils.currentDay() !== today) scheduleFxRefresh();
}

function refreshInBackground() {
  void refreshFxChanges().catch(error =>
    logger.error('FX valuation refresh failed', error),
  );
}

let pending: ReturnType<typeof setTimeout> | null = null;
let refreshPass = 0;

/** Recalculates shortly after a burst of relevant changes. */
export function scheduleFxRefresh() {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    refreshInBackground();
  }, 100);
}

let lastDay: string | null = null;
let dayWatch: ReturnType<typeof setInterval> | null = null;

/** While a budget is open, the current month's close moves with the day. */
export function startFxDayWatch() {
  if (dayWatch) return;
  dayWatch = setInterval(() => {
    if (lastDay !== null && monthUtils.currentDay() !== lastDay) {
      refreshInBackground();
    }
  }, 60_000);
  // Never the reason a process stays alive (Node); browsers have no unref.
  (dayWatch as { unref?: () => void }).unref?.();
}

export function stopFxDayWatch() {
  refreshPass++;
  if (dayWatch) clearInterval(dayWatch);
  if (pending) clearTimeout(pending);
  dayWatch = null;
  pending = null;
  lastDay = null;
}

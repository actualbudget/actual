import { v5 as uuidv5 } from 'uuid';

import { createApp } from '#server/app';
import * as db from '#server/db';
import { exchangeRateModel } from '#server/models';
import { mutator } from '#server/mutators';
import { exchangeRateSpec } from '#server/sync/coupled-cells';
import { withUndo } from '#server/undo';
import {
  getDefaultCurrencyCode,
  getRecordedAmountPrecision,
  isMulticurrencyAvailable,
} from '#server/util/currency';
import { isReviewedCurrency } from '#shared/amount-encoding';
import {
  addUtcDays,
  isValidDate,
  nativeToBase,
  parseRate,
  utcDay,
  utcEndOfDay,
  utcMidnight,
} from '#shared/exchange-rate';
import type { ExchangeRateEntity, ExchangeRateKind } from '#types/models';

export type ExchangeRatesHandlers = {
  'exchange-rates/save': typeof saveRate;
  'exchange-rates/remove': typeof removeRate;
  'exchange-rates/resolve': typeof resolveRateHandler;
};

export const app = createApp<ExchangeRatesHandlers>();
// Undo history is recorded only around actual rate writes, so validation
// failures and no-op captures keep the redo stack intact.
app.method('exchange-rates/save', mutator(saveRate));
app.method('exchange-rates/remove', mutator(removeRate));
app.method('exchange-rates/resolve', resolveRateHandler);

// Rate ids derive from the logical key so offline saves of the same key on
// different devices write one row instead of creating duplicates. Kind is
// part of the key so a manual and a fetched rate can share a midnight.
const RATE_ID_NAMESPACE = 'd2ef61fd-7122-4ac3-a63d-2833d119fd42';
const MANUAL_SOURCE = 'manual';
const FETCHED_FALLBACK_DAYS = 7;

export function exchangeRateId(
  baseCurrency: string,
  quoteCurrency: string,
  source: string,
  kind: string,
  timestamp: string,
): string {
  return uuidv5(
    `${baseCurrency}|${quoteCurrency}|${source}|${kind}|${timestamp}`,
    RATE_ID_NAMESPACE,
  );
}

export type RateResolution =
  | {
      status: 'resolved';
      rate: string;
      kind: ExchangeRateKind | 'explicit';
      source: string;
      timestamp: string | null;
      fallback: boolean;
    }
  | { status: 'unavailable' };

async function requireBaseCurrency(): Promise<string> {
  if (!(await isMulticurrencyAvailable())) {
    throw new Error('multicurrency-unavailable');
  }
  return getDefaultCurrencyCode();
}

function validateQuote(quoteCurrency: unknown, baseCurrency: string): string {
  if (
    typeof quoteCurrency !== 'string' ||
    !isReviewedCurrency(quoteCurrency) ||
    quoteCurrency === baseCurrency
  ) {
    throw new Error('rate-currency-invalid');
  }
  return quoteCurrency;
}

function validateDate(date: unknown): string {
  if (!isValidDate(date)) {
    throw new Error('date-invalid');
  }
  return date;
}

async function getRateRow(id: string) {
  return db.first<ExchangeRateEntity>(
    'SELECT * FROM exchange_rates WHERE id = ?',
    [id],
  );
}

async function liveManualRate(
  baseCurrency: string,
  quoteCurrency: string,
  timestamp: string,
): Promise<ExchangeRateEntity | null> {
  const existing = await getRateRow(
    exchangeRateId(
      baseCurrency,
      quoteCurrency,
      MANUAL_SOURCE,
      'dated',
      timestamp,
    ),
  );
  return existing && !existing.tombstone ? existing : null;
}

/** The only daily manual writer: Settings and manual rate CSV import. */
async function writeManualRate({
  baseCurrency,
  quoteCurrency,
  rate,
  timestamp,
}: {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  timestamp: string;
}): Promise<string> {
  const kind = 'dated';
  const id = exchangeRateId(
    baseCurrency,
    quoteCurrency,
    MANUAL_SOURCE,
    kind,
    timestamp,
  );
  const row = exchangeRateModel.validate({
    id,
    base_currency: baseCurrency,
    quote_currency: quoteCurrency,
    rate,
    kind,
    source: MANUAL_SOURCE,
    timestamp,
    tombstone: 0,
  });
  const spec = exchangeRateSpec(row);
  await withUndo(async () => {
    if (await getRateRow(id)) {
      await db.update('exchange_rates', {
        id,
        rate: row.rate,
        kind: row.kind,
        spec,
        tombstone: 0,
      });
    } else {
      await db.insert('exchange_rates', { ...row, spec });
    }
  });
  return id;
}

async function saveRate({
  quoteCurrency,
  rate,
  date,
  replace = false,
}: {
  quoteCurrency: string;
  rate: string | number;
  date: string;
  replace?: boolean;
}): Promise<
  | { status: 'saved'; id: string }
  | { status: 'duplicate'; existing: ExchangeRateEntity }
> {
  const baseCurrency = await requireBaseCurrency();
  validateQuote(quoteCurrency, baseCurrency);
  const canonical = parseRate(rate);
  validateDate(date);
  const timestamp = utcMidnight(date);
  const existing = await liveManualRate(baseCurrency, quoteCurrency, timestamp);
  if (existing && !replace) {
    return { status: 'duplicate', existing };
  }
  const id = await writeManualRate({
    baseCurrency,
    quoteCurrency,
    rate: canonical,
    timestamp,
  });
  return { status: 'saved', id };
}

async function removeRate({
  quoteCurrency,
  date,
}: {
  quoteCurrency: string;
  date: string;
}): Promise<{ status: 'removed'; id: string } | { status: 'missing' }> {
  const baseCurrency = await requireBaseCurrency();
  validateQuote(quoteCurrency, baseCurrency);
  validateDate(date);
  const id = exchangeRateId(
    baseCurrency,
    quoteCurrency,
    MANUAL_SOURCE,
    'dated',
    utcMidnight(date),
  );
  const existing = await getRateRow(id);
  if (!existing || existing.tombstone) {
    return { status: 'missing' };
  }
  await withUndo(async () => {
    await db.update('exchange_rates', { id, tombstone: 1 });
  });
  return { status: 'removed', id };
}

function newestFirst(a: ExchangeRateEntity, b: ExchangeRateEntity): number {
  if (a.timestamp !== b.timestamp) {
    return a.timestamp < b.timestamp ? 1 : -1;
  }
  if (a.source !== b.source) {
    return a.source < b.source ? -1 : 1;
  }
  return a.id < b.id ? -1 : 1;
}

/**
 * Resolves a rate for one calendar day; an explicit rate wins. Otherwise the
 * order is the exact-date fetched rate, the exact-day manual fallback, then
 * the most recent earlier fetched rate at most seven days old.
 */
export async function resolveRate({
  baseCurrency,
  quoteCurrency,
  date,
  explicitRate,
}: {
  baseCurrency: string;
  quoteCurrency: string;
  date: string;
  explicitRate?: string | number;
}): Promise<RateResolution> {
  if (quoteCurrency === baseCurrency) {
    throw new Error('rate-same-currency');
  }
  if (explicitRate !== undefined) {
    return {
      status: 'resolved',
      rate: parseRate(explicitRate),
      kind: 'explicit',
      source: 'explicit',
      timestamp: null,
      fallback: false,
    };
  }
  // Rows starting after the requested day can never apply. Rows that
  // arrived through sync are re-validated so string order is time order.
  const rows = (
    await db.all<ExchangeRateEntity>(
      `SELECT * FROM exchange_rates
         WHERE base_currency = ? AND quote_currency = ? AND tombstone = 0
           AND timestamp <= ?`,
      [baseCurrency, quoteCurrency, utcEndOfDay(date)],
    )
  )
    .filter(row => {
      try {
        exchangeRateModel.validate(row);
        return true;
      } catch {
        return false;
      }
    })
    .sort(newestFirst);
  const earliestFallback = addUtcDays(date, -FETCHED_FALLBACK_DAYS);
  const steps: Array<[(row: ExchangeRateEntity) => boolean, boolean]> = [
    [row => row.kind === 'fetched' && utcDay(row.timestamp) === date, false],
    [row => row.kind === 'dated' && utcDay(row.timestamp) === date, false],
    [
      row =>
        row.kind === 'fetched' &&
        utcDay(row.timestamp) < date &&
        utcDay(row.timestamp) >= earliestFallback,
      true,
    ],
  ];
  for (const [matches, fallback] of steps) {
    const row = rows.find(matches);
    if (row) {
      return {
        status: 'resolved',
        rate: row.rate,
        kind: row.kind,
        source: row.source,
        timestamp: row.timestamp,
        fallback,
      };
    }
  }
  return { status: 'unavailable' };
}

async function resolveRateHandler({
  quoteCurrency,
  date,
  explicitRate,
}: {
  quoteCurrency: string;
  date: string;
  explicitRate?: string | number;
}): Promise<RateResolution> {
  const baseCurrency = await requireBaseCurrency();
  if (quoteCurrency === baseCurrency) {
    throw new Error('rate-same-currency');
  }
  validateQuote(quoteCurrency, baseCurrency);
  validateDate(date);
  return resolveRate({
    baseCurrency,
    quoteCurrency,
    date,
    explicitRate,
  });
}

/**
 * Computes a foreign entry's final pair without writing anything: a supplied
 * base amount, then the operation's own rate, then the daily policy. The
 * operation's rate is never saved as a daily rate.
 */
export async function computeEntryPair({
  quoteCurrency,
  nativePrecision,
  date,
  nativeAmount,
  baseAmount,
  rate,
}: {
  quoteCurrency: string;
  nativePrecision: number;
  date: string;
  nativeAmount: number;
  baseAmount?: number;
  rate?: string | number;
}): Promise<
  | {
      status: 'ok';
      baseAmount: number;
      nativeAmount: number;
      rate?: Extract<RateResolution, { status: 'resolved' }>;
    }
  | { status: 'rate-unavailable' }
> {
  const baseCurrency = await requireBaseCurrency();
  validateQuote(quoteCurrency, baseCurrency);
  validateDate(date);
  if (!Number.isSafeInteger(nativeAmount)) {
    throw new Error('amount-invalid');
  }
  if (
    !Number.isInteger(nativePrecision) ||
    nativePrecision < 0 ||
    nativePrecision > 15
  ) {
    throw new Error('precision-invalid');
  }
  if (baseAmount !== undefined && !Number.isSafeInteger(baseAmount)) {
    throw new Error('amount-invalid');
  }
  const suppliedRate = rate !== undefined ? parseRate(rate) : undefined;

  let finalBase: number;
  let resolution: Extract<RateResolution, { status: 'resolved' }> | undefined =
    suppliedRate !== undefined
      ? {
          status: 'resolved',
          rate: suppliedRate,
          kind: 'explicit',
          source: 'explicit',
          timestamp: null,
          fallback: false,
        }
      : undefined;
  if (baseAmount !== undefined) {
    finalBase = baseAmount;
  } else if (nativeAmount === 0) {
    finalBase = 0;
  } else if (suppliedRate !== undefined) {
    finalBase = nativeToBase(
      nativeAmount,
      nativePrecision,
      getRecordedAmountPrecision(),
      suppliedRate,
    );
  } else {
    const resolved = await resolveRate({ baseCurrency, quoteCurrency, date });
    if (resolved.status === 'unavailable') {
      return { status: 'rate-unavailable' };
    }
    resolution = resolved;
    finalBase = nativeToBase(
      nativeAmount,
      nativePrecision,
      getRecordedAmountPrecision(),
      resolved.rate,
    );
  }

  return {
    status: 'ok',
    baseAmount: finalBase,
    nativeAmount,
    ...(resolution && { rate: resolution }),
  };
}

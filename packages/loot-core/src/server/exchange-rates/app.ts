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
import type {
  ExchangeRateEntity,
  ExchangeRateKind,
  OperationRate,
} from '#types/models';

import { startFxContext } from './context';
import {
  historyExport,
  historyPage,
  importCancel,
  importCommit,
  importPreview,
  importPreviewBegin,
  removeFetched,
} from './history';
import {
  missingRatesStatus,
  startMissingRates,
  stopMissingRates,
} from './missing-rates';
import { ensureRate } from './provider';

export type ExchangeRatesHandlers = {
  'exchange-rates/save': typeof saveRate;
  'exchange-rates/remove': typeof removeRate;
  'exchange-rates/resolve': typeof resolveRateHandler;
  'exchange-rates/ensure': typeof ensureRateHandler;
  'exchange-rates/import-preview-begin': typeof importPreviewBegin;
  'exchange-rates/import-preview': typeof importPreview;
  'exchange-rates/import-commit': typeof importCommit;
  'exchange-rates/import-cancel': typeof importCancel;
  'exchange-rates/history-page': typeof historyPage;
  'exchange-rates/history-export': typeof historyExport;
  'exchange-rates/remove-fetched': typeof removeFetched;
  'exchange-rates/missing-start': typeof startMissingRates;
  'exchange-rates/missing-stop': typeof stopMissingRates;
  'exchange-rates/missing-status': typeof missingRatesStatus;
  'exchange-rates/pairs': typeof ratePairs;
};

export const app = createApp<ExchangeRatesHandlers>();
app.service(startFxContext);
// Undo history is recorded only around actual rate writes, so validation
// failures and no-op captures keep the redo stack intact.
app.method('exchange-rates/save', mutator(saveRate));
app.method('exchange-rates/remove', mutator(removeRate));
app.method('exchange-rates/resolve', resolveRateHandler);
app.method('exchange-rates/ensure', ensureRateHandler);
app.method('exchange-rates/import-preview-begin', importPreviewBegin);
app.method('exchange-rates/import-preview', importPreview);
app.method('exchange-rates/import-commit', importCommit);
app.method('exchange-rates/import-cancel', importCancel);
app.method('exchange-rates/history-page', historyPage);
app.method('exchange-rates/history-export', historyExport);
app.method('exchange-rates/remove-fetched', removeFetched);
app.method('exchange-rates/missing-start', startMissingRates);
app.method('exchange-rates/missing-stop', stopMissingRates);
app.method('exchange-rates/missing-status', missingRatesStatus);
app.method('exchange-rates/pairs', ratePairs);

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

/** The reviewed currencies of open accounts other than the budget currency. */
export async function openAccountCurrencies(
  baseCurrency: string,
): Promise<string[]> {
  const rows = await db.all<{ currency: string }>(
    `SELECT DISTINCT currency FROM accounts
     WHERE tombstone = 0 AND closed = 0 AND currency IS NOT NULL
       AND currency != ?`,
    [baseCurrency],
  );
  return rows
    .map(row => row.currency)
    .filter(isReviewedCurrency)
    .sort();
}

/**
 * The currencies paired with the budget currency on the rates page: those of
 * open accounts, then any other currency with saved rates.
 */
async function ratePairs(): Promise<{ accounts: string[]; saved: string[] }> {
  const baseCurrency = await requireBaseCurrency();
  const accounts = await openAccountCurrencies(baseCurrency);
  const saved = (
    await db.all<{ quote_currency: string }>(
      `SELECT DISTINCT quote_currency FROM exchange_rates
       WHERE tombstone = 0 AND base_currency = ?`,
      [baseCurrency],
    )
  )
    .map(row => row.quote_currency)
    .filter(code => isReviewedCurrency(code) && !accounts.includes(code))
    .sort();
  return { accounts, saved };
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

/** The only daily manual writer: Settings Save fallback and manual rate CSV import. */
export async function writeManualRate({
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

/** Whether this row is the live, validated fetched observation for exactly this key. */
export function isExactFetchedCoverage(
  row: ExchangeRateEntity | null,
  key: {
    baseCurrency: string;
    quoteCurrency: string;
    date: string;
    source: string;
  },
): boolean {
  if (
    !row ||
    row.tombstone !== 0 ||
    row.kind !== 'fetched' ||
    row.base_currency !== key.baseCurrency ||
    row.quote_currency !== key.quoteCurrency ||
    row.source !== key.source ||
    row.timestamp !== utcMidnight(key.date)
  ) {
    return false;
  }
  try {
    exchangeRateModel.validate(row);
    return row.spec === exchangeRateSpec(row);
  } catch {
    return false;
  }
}

/**
 * The caller owns the short mutator and context guard. Cache writes are
 * outside undo. A fetched tombstone of the same logical key is restored, so a
 * deleted observation can be fetched again; manual rows are never touched.
 */
export async function writeFetchedRate({
  baseCurrency,
  quoteCurrency,
  providerId,
  rate,
  effectiveDate,
  beforeWrite = () => true,
}: {
  baseCurrency: string;
  quoteCurrency: string;
  providerId: string;
  rate: string;
  effectiveDate: string;
  beforeWrite?: () => boolean;
}): Promise<'inserted' | 'existing' | 'not-written'> {
  validateQuote(quoteCurrency, baseCurrency);
  validateDate(effectiveDate);
  if (
    !/^[a-z0-9][a-z0-9-]{0,39}$/.test(providerId) ||
    parseRate(rate) !== rate
  ) {
    throw new Error('rate-invalid');
  }
  const source = `plugin:${providerId}`;
  const timestamp = utcMidnight(effectiveDate);
  const id = exchangeRateId(
    baseCurrency,
    quoteCurrency,
    source,
    'fetched',
    timestamp,
  );
  const existing = await getRateRow(id);
  if (!beforeWrite()) return 'not-written';
  if (existing) {
    // A deterministic id alone does not authorize changing a different logical key.
    if (
      !existing.tombstone ||
      existing.base_currency !== baseCurrency ||
      existing.quote_currency !== quoteCurrency ||
      existing.source !== source ||
      existing.kind !== 'fetched' ||
      existing.timestamp !== timestamp
    ) {
      return 'existing';
    }
    await db.update('exchange_rates', {
      id,
      rate,
      tombstone: 0,
      spec: exchangeRateSpec({ ...existing, rate, kind: 'fetched' }),
    });
    return 'inserted';
  }
  const row = exchangeRateModel.validate({
    id,
    base_currency: baseCurrency,
    quote_currency: quoteCurrency,
    rate,
    source,
    kind: 'fetched',
    timestamp,
    tombstone: 0,
  });
  await db.insert('exchange_rates', { ...row, spec: exchangeRateSpec(row) });
  return 'inserted';
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
 * Selects the rate for one calendar day from stored rows: rows for the pair
 * that are live, start by the end of the day and pass model validation (synced
 * rows are re-validated so string order is time order), newest first. Order:
 * the exact-date fetched rate, the exact-day manual fallback, then the most
 * recent earlier fetched rate at most seven days old.
 */
export function selectRate(
  rows: ExchangeRateEntity[],
  {
    baseCurrency,
    quoteCurrency,
    date,
  }: {
    baseCurrency: string;
    quoteCurrency: string;
    date: string;
  },
): RateResolution {
  const cutoff = utcEndOfDay(date);
  const applicable = rows
    .filter(row => {
      if (
        row.base_currency !== baseCurrency ||
        row.quote_currency !== quoteCurrency ||
        row.tombstone !== 0 ||
        row.timestamp > cutoff
      ) {
        return false;
      }
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
    const row = applicable.find(matches);
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

/** Resolves a rate for one calendar day; an explicit rate wins. */
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
  // Rows starting after the requested day can never apply.
  const rows = await db.all<ExchangeRateEntity>(
    `SELECT * FROM exchange_rates
       WHERE base_currency = ? AND quote_currency = ? AND tombstone = 0
         AND timestamp <= ?`,
    [baseCurrency, quoteCurrency, utcEndOfDay(date)],
  );
  return selectRate(rows, { baseCurrency, quoteCurrency, date });
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

export type { OperationRate };

/**
 * Validates an operation's rate list: valid days, canonical decimal rates,
 * reviewed non-base currencies and no conflicting duplicate keys.
 */
export function parseOperationRates(
  value: unknown,
  baseCurrency: string,
): OperationRate[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error('operation-rates-invalid');
  }
  const seen = new Map<string, string>();
  return value.map(item => {
    if (!item || typeof item !== 'object') {
      throw new Error('operation-rates-invalid');
    }
    const quoteCurrency = validateQuote(item.quoteCurrency, baseCurrency);
    const date = validateDate(item.date);
    const rate = parseRate(item.rate);
    const key = `${quoteCurrency}|${date}`;
    if (seen.has(key) && seen.get(key) !== rate) {
      throw new Error('operation-rates-conflict');
    }
    seen.set(key, rate);
    return { date, quoteCurrency, rate };
  });
}

export function findOperationRate(
  operationRates: OperationRate[] | undefined,
  quoteCurrency: string,
  date: string,
): string | undefined {
  return operationRates?.find(
    item => item.quoteCurrency === quoteCurrency && item.date === date,
  )?.rate;
}

/**
 * Computes a foreign entry's final pair without writing anything: a supplied
 * base amount, then the operation's rate for this currency and day, then the
 * daily policy. The operation's own rate is never saved as a daily rate.
 */
export async function computeEntryPair({
  quoteCurrency,
  nativePrecision,
  date,
  nativeAmount,
  baseAmount,
  rate,
  operationRates,
}: {
  quoteCurrency: string;
  nativePrecision: number;
  date: string;
  nativeAmount: number;
  baseAmount?: number;
  rate?: string | number;
  operationRates?: OperationRate[];
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
  const supplied =
    rate ?? findOperationRate(operationRates, quoteCurrency, date);
  const suppliedRate = supplied !== undefined ? parseRate(supplied) : undefined;

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

export function ensureRateHandler(options: {
  quoteCurrency: string;
  date: string;
}) {
  return ensureRate({
    quoteCurrency: options.quoteCurrency,
    date: options.date,
  });
}

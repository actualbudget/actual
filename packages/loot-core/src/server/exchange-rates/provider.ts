import * as db from '#server/db';
import { runMutator } from '#server/mutators';
import { isReviewedCurrency } from '#shared/amount-encoding';
import { isValidDate, utcMidnight } from '#shared/exchange-rate';
import type { ExchangeRateEntity } from '#types/models';

import {
  exchangeRateId,
  isExactFetchedCoverage,
  resolveRate,
  writeFetchedRate,
} from './app';
import type { RateResolution } from './app';
import {
  captureFxContext,
  createFxController,
  isFxCaptureActive,
  isFxContextCurrent,
  onFxContextChanged,
  releaseFxController,
} from './context';
import type { FxCapture } from './context';
import { lookupExchangeApi } from './exchange-api';
import type { ExchangeApiResult, MissingReason } from './exchange-api';

const LOOKUP_MS = 20000;
const MISSING_MEMO_MS = 60 * 60 * 1000;

export type CoordinatorOutcome =
  | { status: 'cached' }
  | { status: 'inserted' | 'existing'; effectiveDate: string }
  | { status: 'missing'; reason: MissingReason }
  | { status: 'skipped'; reason: 'memo' }
  | { status: 'limited'; reason: 'deadline' }
  | { status: 'superseded' | 'stopped' }
  | { status: 'failed'; code: 'unavailable' | 'malformed' }
  | { status: 'failed'; code: 'rate-limited'; retryAt: number };
export type EnsureRateResult =
  | { status: 'superseded' }
  | (Exclude<CoordinatorOutcome, { status: 'superseded' | 'stopped' }> & {
      context: string;
      resolution: RateResolution;
    })
  | { status: 'stopped'; context: string; resolution: RateResolution };
type EnsureOptions = {
  quoteCurrency: string;
  date: string;
  skipMemo?: boolean;
  stop?: AbortSignal;
  deadline?: AbortSignal;
};
const memo = new Map<string, number>();
const inFlight = new Map<string, Promise<ExchangeApiResult>>();
onFxContextChanged(() => {
  memo.clear();
  inFlight.clear();
});

/** A deleted fetched row must be fetchable again at once. */
export function forgetMissingRates() {
  memo.clear();
}

type Interruption = { interrupted: 'stopped' | 'superseded' | 'deadline' };
async function waitForShared(
  work: Promise<ExchangeApiResult>,
  lifecycle: AbortSignal,
  stop?: AbortSignal,
  deadline?: AbortSignal,
): Promise<ExchangeApiResult | Interruption> {
  const interrupted = (): Interruption | null =>
    lifecycle.aborted
      ? { interrupted: 'superseded' }
      : stop?.aborted
        ? { interrupted: 'stopped' }
        : deadline?.aborted
          ? { interrupted: 'deadline' }
          : null;
  const immediate = interrupted();
  if (immediate) return immediate;
  let finish: (result: Interruption) => void = () => undefined;
  const stopped = new Promise<Interruption>(resolve => {
    finish = resolve;
  });
  const abort = () => {
    const result = interrupted();
    if (result) finish(result);
  };
  lifecycle.addEventListener('abort', abort, { once: true });
  stop?.addEventListener('abort', abort, { once: true });
  deadline?.addEventListener('abort', abort, { once: true });
  try {
    return await Promise.race([work, stopped]);
  } finally {
    lifecycle.removeEventListener('abort', abort);
    stop?.removeEventListener('abort', abort);
    deadline?.removeEventListener('abort', abort);
  }
}

async function finishLookup(
  captured: FxCapture,
  options: EnsureOptions,
  outcome: CoordinatorOutcome,
): Promise<EnsureRateResult> {
  if (
    outcome.status === 'superseded' ||
    !(await isFxContextCurrent(captured))
  ) {
    return { status: 'superseded' };
  }
  const resolution = await resolveRate({
    baseCurrency: captured.baseCurrency,
    quoteCurrency: options.quoteCurrency,
    date: options.date,
  });
  if (!(await isFxContextCurrent(captured))) return { status: 'superseded' };
  if (options.stop?.aborted) {
    return { status: 'stopped', context: captured.context, resolution };
  }
  if (!isFxCaptureActive(captured)) return { status: 'superseded' };
  return { ...outcome, context: captured.context, resolution };
}

/** The current row for the exact provider key, live or not. */
export function readFetchedRow(
  captured: FxCapture,
  quoteCurrency: string,
  date: string,
) {
  return db.first<ExchangeRateEntity>(
    'SELECT * FROM exchange_rates WHERE id = ?',
    [
      exchangeRateId(
        captured.baseCurrency,
        quoteCurrency,
        `plugin:${captured.providerId}`,
        'fetched',
        utcMidnight(date),
      ),
    ],
  );
}

function startLookup(captured: FxCapture, quote: string, date: string) {
  const key = JSON.stringify([captured.revision, quote, date]);
  let shared = inFlight.get(key);
  if (!shared) {
    const controller = createFxController(captured);
    const timer = setTimeout(() => controller.abort(), LOOKUP_MS);
    const work = lookupExchangeApi(
      { base: captured.baseCurrency, quote, date },
      { signal: controller.signal },
    ).finally(() => {
      clearTimeout(timer);
      releaseFxController(controller);
      if (inFlight.get(key) === work) inFlight.delete(key);
    });
    shared = work;
    inFlight.set(key, work);
  }
  return shared;
}

/** Network waits are shared; resolution priority and write authority belong to each caller. */
export async function ensureRate(
  options: EnsureOptions,
): Promise<EnsureRateResult> {
  const captured = await captureFxContext();
  if (!captured) return { status: 'superseded' };
  if (
    !isReviewedCurrency(options.quoteCurrency) ||
    options.quoteCurrency === captured.baseCurrency ||
    !isValidDate(options.date)
  ) {
    return {
      status: 'failed',
      code: 'malformed',
      context: captured.context,
      resolution: { status: 'unavailable' },
    };
  }
  const finish = (outcome: CoordinatorOutcome) =>
    finishLookup(captured, options, outcome);
  if (options.stop?.aborted) return finish({ status: 'stopped' });
  if (options.deadline?.aborted) {
    return finish({ status: 'limited', reason: 'deadline' });
  }
  // Only the exact fetched observation suppresses a request; manual and
  // earlier fallback rows satisfy conversions but not provider coverage.
  const row = await readFetchedRow(
    captured,
    options.quoteCurrency,
    options.date,
  );
  if (!(await isFxContextCurrent(captured))) return { status: 'superseded' };
  if (
    isExactFetchedCoverage(row, {
      baseCurrency: captured.baseCurrency,
      quoteCurrency: options.quoteCurrency,
      date: options.date,
      source: `plugin:${captured.providerId}`,
    })
  ) {
    return finish({ status: 'cached' });
  }
  const memoKey = JSON.stringify([
    captured.context,
    options.quoteCurrency,
    options.date,
  ]);
  const remembered = memo.get(memoKey);
  if (
    !options.skipMemo &&
    remembered !== undefined &&
    Date.now() - remembered < MISSING_MEMO_MS
  ) {
    return finish({ status: 'skipped', reason: 'memo' });
  }
  const caller = createFxController(captured);
  let response: ExchangeApiResult | Interruption;
  try {
    response = await waitForShared(
      startLookup(captured, options.quoteCurrency, options.date),
      caller.signal,
      options.stop,
      options.deadline,
    );
  } finally {
    releaseFxController(caller);
  }
  if (!(await isFxContextCurrent(captured))) return { status: 'superseded' };
  if (options.stop?.aborted) return finish({ status: 'stopped' });
  if ('interrupted' in response) {
    return response.interrupted === 'deadline'
      ? finish({ status: 'limited', reason: 'deadline' })
      : finish({ status: response.interrupted });
  }
  if (response.status === 'error') {
    const { status: _error, ...failure } = response;
    return finish({ status: 'failed', ...failure });
  }
  if (response.status === 'missing') {
    const result = await finish(response);
    // Remember the miss only when the caller receives it; a stopped or
    // superseded lookup leaves the date to be asked again.
    if (result.status === 'missing') {
      memo.set(memoKey, Date.now());
    }
    return result;
  }
  const rate = response.rate;
  const outcome = await runMutator(async (): Promise<CoordinatorOutcome> => {
    if (!(await isFxContextCurrent(captured))) return { status: 'superseded' };
    if (options.stop?.aborted) return { status: 'stopped' };
    if (options.deadline?.aborted) {
      return { status: 'limited', reason: 'deadline' };
    }
    const status = await writeFetchedRate({
      baseCurrency: captured.baseCurrency,
      quoteCurrency: options.quoteCurrency,
      providerId: captured.providerId,
      rate,
      effectiveDate: options.date,
      beforeWrite: () =>
        isFxCaptureActive(captured) &&
        !options.stop?.aborted &&
        !options.deadline?.aborted,
    });
    if (status === 'not-written') {
      if (!isFxCaptureActive(captured)) return { status: 'superseded' };
      if (options.stop?.aborted) return { status: 'stopped' };
      return { status: 'limited', reason: 'deadline' };
    }
    return { status, effectiveDate: options.date };
  });
  return finish(outcome);
}

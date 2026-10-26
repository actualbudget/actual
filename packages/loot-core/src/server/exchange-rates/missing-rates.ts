import { v4 as uuidv4 } from 'uuid';

import * as connection from '#platform/server/connection';
import * as prefs from '#server/prefs';
import { isMulticurrencyAvailable } from '#server/util/currency';
import { addUtcDays } from '#shared/exchange-rate';
import * as monthUtils from '#shared/months';
import type { MissingRatesProgress } from '#types/models/exchange-rate-history';

import {
  captureFxContext,
  isFxCaptureActive,
  isFxContextCurrent,
  onFxContextChanged,
} from './context';
import type { FxCapture } from './context';
import {
  iterateMissingRateDates,
  readFetchedDays,
  readMissingRateRanges,
} from './coverage';
import type { RateKey } from './coverage';
import { ensureRate } from './provider';
import type { EnsureRateResult } from './provider';

const WORKERS = 4;
const SEGMENT_MS = 10 * 60 * 1000;
const FAILURES_BEFORE_PAUSE = 5;
const QUOTE_OMITTED_SETTLE_DAYS = 3;

export type FinishReason = 'done' | 'user' | 'failing' | 'superseded';
type Run = {
  captured: FxCapture;
  reason: 'automatic' | 'manual';
  /** A later automatic trigger joined this run; its ranges may be stale. */
  dirty: boolean;
  progress: MissingRatesProgress;
  keys: AsyncGenerator<RateKey>;
  retry: RateKey[];
  exhausted: boolean;
  pulling: boolean;
  active: number;
  failures: number;
  latestServed: string;
  today: string;
  gaps: Set<string>;
  gapPrefix: string;
  stop: AbortController;
  segment: AbortController;
  segmentTimer?: ReturnType<typeof setTimeout>;
  pauseTimer?: ReturnType<typeof setTimeout>;
};

let current: Run | null = null;
let last: MissingRatesProgress | null = null;
const finished = new Set<Parameters<typeof onMissingRatesFinished>[0]>();
onFxContextChanged(() => {
  if (current) finish(current, 'stopped', 'superseded');
});

/** The lifecycle hears why a run ended, to schedule retries or suppress restarts. */
export function onMissingRatesFinished(
  listener: (
    reason: FinishReason,
    run: { dirty: boolean; missing: number },
  ) => void,
) {
  finished.add(listener);
  return () => {
    finished.delete(listener);
  };
}

function emit(run: Run) {
  last = { ...run.progress };
  connection.send('exchange-rates-update', last);
}

function saveGaps(run: Run) {
  const others = (prefs.getPrefs()?.exchangeRateGaps ?? []).filter(
    gap => !gap.startsWith(run.gapPrefix),
  );
  void prefs.savePrefs(
    { exchangeRateGaps: [...others, ...run.gaps] },
    { avoidSync: true },
  );
}

function finish(run: Run, state: 'done' | 'stopped', reason: FinishReason) {
  if (current !== run) return;
  current = null;
  clearTimeout(run.segmentTimer);
  clearTimeout(run.pauseTimer);
  run.stop.abort();
  run.progress.state = state;
  delete run.progress.retryAt;
  if (reason !== 'superseded') saveGaps(run);
  void run.keys.return(undefined);
  emit(run);
  for (const listener of finished) {
    listener(reason, { dirty: run.dirty, missing: run.progress.missing });
  }
}

function startSegment(run: Run) {
  clearTimeout(run.segmentTimer);
  run.segment = new AbortController();
  const segment = run.segment;
  run.segmentTimer = setTimeout(() => segment.abort(), SEGMENT_MS);
}

function settle(run: Run, key: RateKey, reason: string) {
  run.gaps.add(`${run.gapPrefix}${key.quoteCurrency}|${key.date}|${reason}`);
}

function pause(run: Run, retryAt: number) {
  if (run.progress.state === 'paused') return;
  run.progress.state = 'paused';
  run.progress.retryAt = retryAt;
  clearTimeout(run.segmentTimer);
  emit(run);
  // Waiting out a cooldown is outside the lookup and segment deadlines.
  run.pauseTimer = setTimeout(
    () => void resume(run),
    Math.max(0, retryAt - Date.now()),
  );
}

async function resume(run: Run) {
  if (current !== run) return;
  if (!(await isFxContextCurrent(run.captured))) {
    finish(run, 'stopped', 'superseded');
    return;
  }
  if (current !== run) return;
  run.progress.state = 'running';
  delete run.progress.retryAt;
  startSegment(run);
  emit(run);
  void pump(run);
}

function handle(run: Run, key: RateKey, result: EnsureRateResult) {
  run.active--;
  if (current !== run) return;
  if (result.status === 'superseded' || !isFxCaptureActive(run.captured)) {
    finish(run, 'stopped', 'superseded');
    return;
  }
  switch (result.status) {
    case 'stopped':
      return;
    case 'cached':
    case 'inserted':
    case 'existing':
      if (result.status === 'inserted') run.progress.added++;
      run.failures = 0;
      if (key.date > run.latestServed) run.latestServed = key.date;
      break;
    case 'missing':
      run.progress.missing++;
      run.failures = 0;
      if (result.reason === 'quote-omitted') {
        if (key.date > run.latestServed) run.latestServed = key.date;
        if (key.date <= addUtcDays(run.today, -QUOTE_OMITTED_SETTLE_DAYS)) {
          settle(run, key, result.reason);
        }
      } else if (key.date < run.latestServed) {
        settle(run, key, result.reason);
      }
      break;
    case 'skipped':
      // A remembered miss asked nobody, so it is not a fresh miss.
      break;
    case 'limited':
      run.retry.push(key);
      break;
    case 'failed':
      if (result.code === 'rate-limited') {
        run.retry.push(key);
        pause(run, result.retryAt);
        break;
      }
      run.progress.errors++;
      if (++run.failures >= FAILURES_BEFORE_PAUSE) {
        finish(run, 'stopped', 'failing');
        return;
      }
      break;
    default:
      break;
  }
  emit(run);
  void pump(run);
}

async function pump(run: Run) {
  if (run.pulling) return;
  run.pulling = true;
  try {
    while (
      current === run &&
      run.progress.state === 'running' &&
      !run.segment.signal.aborted &&
      run.active < WORKERS
    ) {
      let key = run.retry.shift();
      if (!key && !run.exhausted) {
        let next: IteratorResult<RateKey>;
        try {
          next = await run.keys.next();
        } catch {
          finish(run, 'stopped', 'failing');
          return;
        }
        if (next.done) run.exhausted = true;
        else key = next.value;
      }
      if (!key) break;
      run.active++;
      const taken = key;
      void ensureRate({
        quoteCurrency: taken.quoteCurrency,
        date: taken.date,
        skipMemo: run.reason === 'manual',
        stop: run.stop.signal,
        deadline: run.segment.signal,
      }).then(
        result => handle(run, taken, result),
        () =>
          handle(run, taken, {
            status: 'failed',
            code: 'unavailable',
            context: run.captured.context,
            resolution: { status: 'unavailable' },
          }),
      );
    }
  } finally {
    run.pulling = false;
  }
  if (current !== run || run.active > 0) return;
  if (run.progress.state !== 'running') return;
  if (run.exhausted && run.retry.length === 0) {
    finish(run, 'done', 'done');
  } else if (run.segment.signal.aborted) {
    // A clean segment deadline: completed results are saved, so yield and continue.
    startSegment(run);
    setTimeout(() => void pump(run), 0);
  }
}

/** Starts filling every missing daily rate of account history, or joins the current run. */
export async function startMissingRates({
  reason,
}: {
  reason: 'automatic' | 'manual';
}): Promise<{ runId: string } | { status: 'unavailable' }> {
  if (!(await isMulticurrencyAvailable())) return { status: 'unavailable' };
  if (current && (reason === 'automatic' || current.reason === 'manual')) {
    if (reason === 'automatic') current.dirty = true;
    return { runId: current.progress.runId };
  }
  if (current) finish(current, 'stopped', 'superseded');
  const captured = await captureFxContext();
  if (!captured) return { status: 'unavailable' };
  const today = monthUtils.currentDay();
  const source = `plugin:${captured.providerId}`;
  const ranges = await readMissingRateRanges(captured.baseCurrency, today);
  const fetched = await readFetchedDays(captured.baseCurrency, source);
  const gapPrefix = `${captured.providerId}|${captured.providerVersion}|${captured.baseCurrency}|`;
  const inRange = (gap: string) => {
    const [quote, date] = gap.slice(gapPrefix.length).split('|');
    return ranges.some(
      range =>
        range.quoteCurrency === quote && date >= range.from && date <= range.to,
    );
  };
  // A manual retry revisits settled gaps; other runs keep those still in history.
  const gaps = new Set(
    reason === 'manual'
      ? []
      : (prefs.getPrefs()?.exchangeRateGaps ?? []).filter(
          gap => gap.startsWith(gapPrefix) && inRange(gap),
        ),
  );
  const settledKeys = new Set(
    [...gaps].map(gap => gap.slice(gapPrefix.length).split('|', 2).join('|')),
  );
  if (!(await isFxContextCurrent(captured))) return { status: 'unavailable' };
  // A run that started meanwhile: a manual request replaces an automatic one.
  if (current && (reason === 'automatic' || current.reason === 'manual')) {
    if (reason === 'automatic') current.dirty = true;
    return { runId: current.progress.runId };
  }
  if (current) finish(current, 'stopped', 'superseded');
  let latestServed = '';
  for (const days of fetched.values()) {
    for (const day of days) if (day > latestServed) latestServed = day;
  }
  const run: Run = {
    captured,
    reason,
    dirty: false,
    progress: {
      runId: uuidv4(),
      context: captured.context,
      state: 'running',
      added: 0,
      missing: 0,
      errors: 0,
    },
    keys: iterateMissingRateDates(
      ranges,
      fetched,
      key => settledKeys.has(`${key.quoteCurrency}|${key.date}`),
      today,
    ),
    retry: [],
    exhausted: false,
    pulling: false,
    active: 0,
    failures: 0,
    latestServed,
    today,
    gaps,
    gapPrefix,
    stop: new AbortController(),
    segment: new AbortController(),
  };
  current = run;
  startSegment(run);
  emit(run);
  void pump(run);
  return { runId: run.progress.runId };
}

/** Stops an automatic run and returns how many of its lookups found nothing. */
export function stopAutomaticMissingRates(): number {
  if (current?.reason !== 'automatic') return 0;
  const missing = current.progress.missing;
  // The context is unchanged, so the gaps this run settled stay valid.
  saveGaps(current);
  finish(current, 'stopped', 'superseded');
  return missing;
}

export async function stopMissingRates({
  runId,
}: {
  runId: string;
}): Promise<void> {
  if (current?.progress.runId === runId) finish(current, 'stopped', 'user');
}

/** The current or last run of this context, for a page that opens mid-run. */
export async function missingRatesStatus(): Promise<MissingRatesProgress | null> {
  const captured = await captureFxContext();
  return captured && last?.context === captured.context ? last : null;
}

import { v4 as uuidv4 } from 'uuid';

import * as connection from '#platform/server/connection';
import { isReviewedCurrency } from '#shared/amount-encoding';
import { addUtcDays, isValidDate } from '#shared/exchange-rate';
import type {
  BackfillProgress,
  BackfillStopReason,
} from '#types/models/exchange-rate-history';

import { resolveRate } from './app';
import {
  captureFxContext,
  isFxCaptureActive,
  isFxContextCurrent,
  onFxContextChanged,
} from './context';
import type { FxCapture } from './context';
import { ensureRate, providerStatus } from './provider';
import type { CoordinatorOutcome, ProviderStatus } from './provider';

export type BackfillOptions = {
  quoteCurrency: string;
  from: string;
  to: string;
  policy: 'keep' | 'replace';
};
type Superseded = { status: 'superseded' };
type ErrorCode =
  | 'range-invalid'
  | 'range-too-large'
  | 'range-future'
  | 'currency-invalid'
  | 'no-server'
  | 'no-provider'
  | 'not-installed'
  | 'not-configured'
  | 'status-unavailable';
type BackfillError = {
  status: 'error';
  code: ErrorCode;
  statusCode?: Extract<ProviderStatus, { status: 'unavailable' }>['code'];
};
type Prepared = {
  status: 'ok';
  captured: FxCapture;
  dates: string[];
  cached: number;
};
type PlanResult =
  | BackfillError
  | Superseded
  | {
      status: 'ok';
      context: string;
      dates: number;
      cached: number;
      toFetch: number;
    };
type StartResult =
  | BackfillError
  | Superseded
  | { status: 'error'; code: 'busy' }
  | { status: 'started'; jobId: string };
type Job = {
  captured: FxCapture;
  options: BackfillOptions;
  dates: string[];
  progress: BackfillProgress;
  stop: AbortController;
  timer: ReturnType<typeof setTimeout>;
  next: number;
  active: number;
  failures: number;
};
let currentJob: Job | null = null;
let starting = false;
onFxContextChanged(() => {
  if (currentJob) stopJob(currentJob, 'superseded');
});

async function prepare(
  options: BackfillOptions,
): Promise<Prepared | BackfillError | Superseded> {
  const before = await captureFxContext();
  if (!before) return { status: 'superseded' };
  if (
    !options ||
    !isValidDate(options.from) ||
    !isValidDate(options.to) ||
    options.from > options.to ||
    (options.policy !== 'keep' && options.policy !== 'replace')
  ) {
    return { status: 'error', code: 'range-invalid' };
  }
  if (
    !isReviewedCurrency(options.quoteCurrency) ||
    options.quoteCurrency === before.baseCurrency
  ) {
    return { status: 'error', code: 'currency-invalid' };
  }
  const count =
    Math.round(
      (Date.parse(`${options.to}T00:00:00.000Z`) -
        Date.parse(`${options.from}T00:00:00.000Z`)) /
        86400000,
    ) + 1;
  if (count > 366) return { status: 'error', code: 'range-too-large' };
  if (options.to > new Date().toISOString().slice(0, 10)) {
    return { status: 'error', code: 'range-future' };
  }
  if (!before.server) return { status: 'error', code: 'no-server' };
  const status = await providerStatus();
  if (status.status === 'superseded') return status;
  if (status.status === 'no-server') {
    return { status: 'error', code: 'no-server' };
  }
  if (status.status === 'unavailable') {
    return {
      status: 'error',
      code: 'status-unavailable',
      statusCode: status.code,
    };
  }
  if (!status.selected) {
    return {
      status: 'error',
      code: before.providerId ? 'not-installed' : 'no-provider',
    };
  }
  const provider = status.installed.find(
    provider => provider.id === status.selected,
  );
  if (!provider) return { status: 'error', code: 'not-installed' };
  if (provider.fields.some(field => field.required && !field.configured)) {
    return { status: 'error', code: 'not-configured' };
  }
  const captured = await captureFxContext();
  if (!captured || captured.context !== status.context) {
    return { status: 'superseded' };
  }
  const dates = Array.from({ length: count }, (_, n) =>
    addUtcDays(options.from, n),
  );
  let cached = 0;
  if (options.policy === 'keep') {
    for (const date of dates) {
      const local = await resolveRate({
        baseCurrency: captured.baseCurrency,
        quoteCurrency: options.quoteCurrency,
        date,
        forEntry: false,
      });
      if (
        local.status === 'resolved' &&
        local.kind === 'fetched' &&
        !local.fallback
      ) {
        cached++;
      }
    }
  }
  if (!(await isFxContextCurrent(captured)) || !isFxCaptureActive(captured)) {
    return { status: 'superseded' };
  }
  return { status: 'ok', captured, dates, cached };
}

export async function backfillPlan(
  options: BackfillOptions,
): Promise<PlanResult> {
  const ready = await prepare(options);
  if (ready.status !== 'ok') return ready;
  return {
    status: 'ok',
    context: ready.captured.context,
    dates: ready.dates.length,
    cached: ready.cached,
    toFetch: ready.dates.length - ready.cached,
  };
}
function emit(job: Job) {
  connection.send('fx-backfill-progress', { ...job.progress });
}
function finishJob(
  job: Job,
  state: 'done' | 'stopped',
  reason?: BackfillStopReason,
) {
  if (job.progress.state !== 'running') return;
  job.progress.state = state;
  if (reason) job.progress.stopReason = reason;
  clearTimeout(job.timer);
  if (currentJob === job) currentJob = null;
  if (state === 'stopped') job.stop.abort();
  emit(job);
}
function stopJob(job: Job, reason: BackfillStopReason) {
  finishJob(job, 'stopped', reason);
}

function processResult(job: Job, result: CoordinatorOutcome) {
  job.active--;
  if (job.progress.state !== 'running') return;
  if (!isFxCaptureActive(job.captured) || result.status === 'superseded') {
    stopJob(job, 'superseded');
    return;
  }
  if (result.status === 'stopped') {
    stopJob(job, 'cancelled');
    return;
  }
  if (result.status === 'limited') {
    stopJob(job, 'deadline');
    return;
  }
  if (result.status === 'skipped' && result.reason !== 'not-installed') {
    stopJob(job, result.reason === 'memo' ? 'provider-failing' : 'superseded');
    return;
  }
  let stopReason: BackfillStopReason | undefined;
  if (result.status === 'skipped') {
    job.progress.failed++;
    stopReason = 'not-installed';
  } else if (result.status === 'failed') {
    job.progress.failed++;
    job.failures++;
    if (
      result.code === 'rate-limited' ||
      result.code === 'auth' ||
      result.code === 'not-configured'
    ) {
      stopReason = result.code;
    } else if (job.failures >= 5) {
      stopReason = 'provider-failing';
    }
  } else {
    job.progress[result.status]++;
    job.failures = 0;
  }
  job.progress.done++;
  job.progress.unprocessed = job.progress.total - job.progress.done;
  if (stopReason) {
    stopJob(job, stopReason);
    return;
  }
  if (job.progress.done === job.progress.total) {
    finishJob(job, 'done');
    return;
  }
  emit(job);
  refill(job);
}
function refill(job: Job) {
  while (
    job.progress.state === 'running' &&
    job.active < 4 &&
    job.next < job.dates.length
  ) {
    const date = job.dates[job.next++];
    job.active++;
    void ensureRate({
      quoteCurrency: job.options.quoteCurrency,
      date,
      forEntry: false,
      refresh: job.options.policy === 'replace',
      skipMemo: true,
      stop: job.stop.signal,
    }).then(
      result => processResult(job, result),
      () => processResult(job, { status: 'failed', code: 'server-error' }),
    );
  }
}

export async function backfillStart(
  options: BackfillOptions & { context: string },
): Promise<StartResult> {
  const captured = await captureFxContext();
  if (!captured || captured.context !== options.context) {
    return { status: 'superseded' };
  }
  if (currentJob || starting) return { status: 'error', code: 'busy' };
  starting = true;
  try {
    const ready = await prepare(options);
    if (ready.status !== 'ok') return ready;
    if (
      ready.captured.context !== options.context ||
      !isFxCaptureActive(ready.captured)
    ) {
      return { status: 'superseded' };
    }
    const jobId = uuidv4();
    const job: Job = {
      captured: ready.captured,
      options: {
        quoteCurrency: options.quoteCurrency,
        from: options.from,
        to: options.to,
        policy: options.policy,
      },
      dates: ready.dates,
      next: 0,
      active: 0,
      failures: 0,
      stop: new AbortController(),
      timer: setTimeout(() => stopJob(job, 'deadline'), 10 * 60 * 1000),
      progress: {
        jobId,
        context: ready.captured.context,
        state: 'running',
        total: ready.dates.length,
        done: 0,
        unprocessed: ready.dates.length,
        inserted: 0,
        replaced: 0,
        existing: 0,
        cached: 0,
        missing: 0,
        failed: 0,
      },
    };
    currentJob = job;
    emit(job);
    refill(job);
    return { status: 'started', jobId };
  } finally {
    starting = false;
  }
}

export async function backfillCancel({
  jobId,
}: {
  jobId: string;
}): Promise<void> {
  if (currentJob?.progress.jobId === jobId) stopJob(currentJob, 'cancelled');
}

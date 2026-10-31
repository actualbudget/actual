import { runMutator } from '#server/mutators';
import { getServer } from '#server/server-config';
import { isReviewedCurrency } from '#shared/amount-encoding';
import { addUtcDays, isValidDate, parseRate } from '#shared/exchange-rate';

import { resolveRate, writeFetchedRate } from './app';
import type { RateResolution } from './app';
import type { FxCapture } from './context';
import {
  captureFxContext,
  createFxController,
  isFxCaptureActive,
  isFxContextCurrent,
  notifyFxContextChanged,
  onFxContextChanged,
  releaseFxController,
  setFxProviderIdentity,
} from './context';
import { fxRequest, isObject } from './transport';
import type { FxRequestResult, FxTransportCode, JsonValue } from './transport';

export type ProviderInfo = {
  id: string;
  name: string;
  version: string;
  origins: string[];
  fields: Array<{
    key: string;
    label: string;
    secret: boolean;
    required: boolean;
    configured: boolean;
    value?: string;
  }>;
};

type StatusError =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'token-expired'
  | 'server-error';
export type ProviderStatus =
  | { status: 'superseded' }
  | { status: 'no-server'; context: string }
  | { status: 'unavailable'; context: string; code: StatusError }
  | {
      status: 'ok';
      context: string;
      selected: string | null;
      installed: ProviderInfo[];
      last: LastLookup | null;
    };

function boundedText(value: JsonValue, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function validOrigin(value: JsonValue): value is string {
  if (!boundedText(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function projectProvider(value: JsonValue): ProviderInfo | null {
  if (
    !isObject(value) ||
    !boundedText(value.id, 40) ||
    !/^[a-z0-9][a-z0-9-]{0,39}$/.test(value.id) ||
    !boundedText(value.name, 64) ||
    !boundedText(value.version, 32) ||
    !Array.isArray(value.origins) ||
    value.origins.length > 10 ||
    !value.origins.every(validOrigin) ||
    !Array.isArray(value.fields) ||
    value.fields.length > 10
  ) {
    return null;
  }
  const fields: ProviderInfo['fields'] = [];
  const keys = new Set<string>();
  for (const field of value.fields) {
    if (
      !isObject(field) ||
      !boundedText(field.key, 32) ||
      !/^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(field.key) ||
      !boundedText(field.label, 64) ||
      typeof field.secret !== 'boolean' ||
      typeof field.required !== 'boolean' ||
      typeof field.configured !== 'boolean' ||
      keys.has(field.key) ||
      ('value' in field && (field.secret || !boundedText(field.value, 2048)))
    ) {
      return null;
    }
    keys.add(field.key);
    fields.push({
      key: field.key,
      label: field.label,
      secret: field.secret,
      required: field.required,
      configured: field.configured,
      ...(typeof field.value === 'string' && !field.secret
        ? { value: field.value }
        : {}),
    });
  }
  return {
    id: value.id,
    name: value.name,
    version: value.version,
    origins: [...value.origins],
    fields,
  };
}

function statusError(code: FxTransportCode): StatusError {
  switch (code) {
    case 'network':
    case 'timeout':
    case 'unauthorized':
    case 'token-expired':
      return code;
    default:
      return 'server-error';
  }
}

/** Reads the server's one direct binding. Discovery may establish a new identity. */
export async function providerStatus(): Promise<ProviderStatus> {
  const captured = await captureFxContext();
  if (!captured) return { status: 'superseded' };
  if (!captured.server) {
    return { status: 'no-server', context: captured.context };
  }
  const server = getServer(captured.server);
  if (!server) return { status: 'no-server', context: captured.context };
  const controller = createFxController(captured);
  const result = await fxRequest(
    'providers',
    {},
    {
      server: server.EXCHANGE_RATES_SERVER,
      token: captured.token,
      lifecycle: controller.signal,
    },
  );
  releaseFxController(controller);
  if (!(await isFxContextCurrent(captured))) return { status: 'superseded' };
  if (result.ok === false) {
    return result.code === 'cancelled'
      ? { status: 'superseded' }
      : {
          status: 'unavailable',
          context: captured.context,
          code: statusError(result.code),
        };
  }
  const raw = result.data.providers;
  if (!Array.isArray(raw) || raw.length > 1) {
    return {
      status: 'unavailable',
      context: captured.context,
      code: 'server-error',
    };
  }
  const provider = raw.length ? projectProvider(raw[0]) : null;
  if (raw.length && !provider) {
    return {
      status: 'unavailable',
      context: captured.context,
      code: 'server-error',
    };
  }
  const current = await setFxProviderIdentity(
    provider
      ? {
          id: provider.id,
          version: provider.version,
          fingerprint: JSON.stringify(provider),
        }
      : null,
    captured,
  );
  if (!current || !isFxCaptureActive(current)) return { status: 'superseded' };
  return {
    status: 'ok',
    context: current.context,
    selected: provider?.id ?? null,
    installed: provider ? [provider] : [],
    last,
  };
}

type LookupError =
  | StatusError
  | 'not-configured'
  | 'auth'
  | 'rate-limited'
  | 'unavailable'
  | 'provider-error'
  | 'malformed';
export type CoordinatorOutcome =
  | { status: 'cached' }
  | {
      status: 'inserted' | 'existing' | 'replaced';
      effectiveDate: string;
      fallback: boolean;
    }
  | { status: 'missing'; reason: 'provider' | 'stale' }
  | {
      status: 'skipped';
      reason: 'no-server' | 'no-provider' | 'not-installed' | 'memo';
    }
  | { status: 'limited'; reason: 'cap' | 'deadline' }
  | { status: 'superseded' | 'stopped' }
  | { status: 'failed'; code: LookupError };
type LastLookup = {
  pluginId: string;
  pluginVersion: string | null;
  base: string;
  quote: string;
  requestedDate: string;
  outcome: CoordinatorOutcome;
  at: string;
};
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
  forEntry: boolean;
  refresh?: boolean;
  skipMemo?: boolean;
  stop?: AbortSignal;
  deadline?: AbortSignal;
};
const memo = new Map<string, { at: number; notInstalled: boolean }>();
const inFlight = new Map<string, Promise<FxRequestResult>>();
let last: LastLookup | null = null;
onFxContextChanged(() => {
  memo.clear();
  inFlight.clear();
  last = null;
});

function lookupError(code: FxTransportCode): LookupError {
  switch (code) {
    case 'network':
    case 'timeout':
    case 'unauthorized':
    case 'token-expired':
      return code;
    default:
      return 'server-error';
  }
}

type Interruption = { interrupted: 'stopped' | 'superseded' | 'deadline' };
async function waitForShared(
  work: Promise<FxRequestResult>,
  lifecycle: AbortSignal,
  stop?: AbortSignal,
  deadline?: AbortSignal,
): Promise<FxRequestResult | Interruption> {
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
    forEntry: options.forEntry,
  });
  if (!(await isFxContextCurrent(captured))) return { status: 'superseded' };
  if (options.stop?.aborted) {
    return { status: 'stopped', context: captured.context, resolution };
  }
  if (!isFxCaptureActive(captured)) return { status: 'superseded' };
  if (captured.providerId && outcome.status !== 'stopped') {
    last = {
      pluginId: captured.providerId,
      pluginVersion: captured.providerVersion,
      base: captured.baseCurrency,
      quote: options.quoteCurrency,
      requestedDate: options.date,
      outcome,
      at: new Date().toISOString(),
    };
  }
  return { ...outcome, context: captured.context, resolution };
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
  const local = await resolveRate({
    baseCurrency: captured.baseCurrency,
    quoteCurrency: options.quoteCurrency,
    date: options.date,
    forEntry: options.forEntry,
  });
  if (!(await isFxContextCurrent(captured))) return { status: 'superseded' };
  if (
    !options.refresh &&
    local.status === 'resolved' &&
    (local.kind === 'explicit' ||
      local.kind === 'dated' ||
      (local.kind === 'fetched' && !local.fallback))
  ) {
    return finish({ status: 'cached' });
  }
  if (!captured.server) {
    return finish({ status: 'skipped', reason: 'no-server' });
  }
  if (!captured.providerId) {
    return finish({ status: 'skipped', reason: 'no-provider' });
  }
  const key = JSON.stringify([
    captured.revision,
    captured.budgetId,
    captured.context,
    options.quoteCurrency,
    options.date,
  ]);
  const remembered = memo.get(key);
  if (
    !options.refresh &&
    !options.skipMemo &&
    remembered &&
    Date.now() - remembered.at < 3600000
  ) {
    return finish({
      status: 'skipped',
      reason: remembered.notInstalled ? 'not-installed' : 'memo',
    });
  }
  const requestKey = `${key}:${Boolean(options.refresh)}`;
  let shared = inFlight.get(requestKey);
  if (!shared) {
    const controller = createFxController(captured);
    const server = getServer(captured.server);
    if (!server) {
      releaseFxController(controller);
      return finish({ status: 'skipped', reason: 'no-server' });
    }
    const work = fxRequest(
      'lookup',
      {
        providerId: captured.providerId,
        base: captured.baseCurrency,
        quote: options.quoteCurrency,
        date: options.date,
      },
      {
        server: server.EXCHANGE_RATES_SERVER,
        token: captured.token,
        lifecycle: controller.signal,
      },
    ).catch((): FxRequestResult => ({ ok: false, code: 'network' }));
    shared = work.finally(() => {
      releaseFxController(controller);
      if (inFlight.get(requestKey) === shared) inFlight.delete(requestKey);
    });
    inFlight.set(requestKey, shared);
  }
  const caller = createFxController(captured);
  let response: FxRequestResult | Interruption;
  try {
    response = await waitForShared(
      shared,
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
  if (response.ok === false) {
    if (response.code === 'cancelled') return { status: 'superseded' };
    if (response.code === 'deadline') {
      return finish({ status: 'limited', reason: 'deadline' });
    }
    return finish({ status: 'failed', code: lookupError(response.code) });
  }
  const data = response.data;
  const remember = (notInstalled = false) =>
    memo.set(key, { at: Date.now(), notInstalled });
  if (data.outcome === 'error') {
    if (data.code === 'not-installed') {
      remember(true);
      return finish({ status: 'skipped', reason: 'not-installed' });
    }
    const code = [
      'not-configured',
      'auth',
      'rate-limited',
      'unavailable',
      'timeout',
      'provider-error',
    ].find(code => code === data.code);
    switch (code) {
      case 'not-configured':
      case 'auth':
      case 'rate-limited':
      case 'unavailable':
      case 'timeout':
      case 'provider-error':
        return finish({ status: 'failed', code });
      default:
        return finish({ status: 'failed', code: 'malformed' });
    }
  }
  if (
    !isObject(data.plugin) ||
    !boundedText(data.plugin.id, 40) ||
    !/^[a-z0-9][a-z0-9-]{0,39}$/.test(data.plugin.id) ||
    !boundedText(data.plugin.version, 32)
  ) {
    return finish({ status: 'failed', code: 'malformed' });
  }
  if (
    data.plugin.id !== captured.providerId ||
    data.plugin.version !== captured.providerVersion
  ) {
    await notifyFxContextChanged('provider');
    return { status: 'superseded' };
  }
  if (data.outcome === 'missing') {
    remember();
    return finish({ status: 'missing', reason: 'provider' });
  }
  if (
    data.outcome !== 'ok' ||
    data.base !== captured.baseCurrency ||
    data.quote !== options.quoteCurrency ||
    typeof data.rate !== 'string' ||
    !isValidDate(data.effectiveDate) ||
    data.effectiveDate > options.date
  ) {
    return finish({ status: 'failed', code: 'malformed' });
  }
  const rate = data.rate;
  try {
    if (parseRate(rate) !== rate) {
      return finish({ status: 'failed', code: 'malformed' });
    }
  } catch {
    return finish({ status: 'failed', code: 'malformed' });
  }
  const effectiveDate = data.effectiveDate;
  if (effectiveDate < addUtcDays(options.date, -7)) {
    remember();
    return finish({ status: 'missing', reason: 'stale' });
  }
  const outcome = await runMutator(async (): Promise<CoordinatorOutcome> => {
    if (!(await isFxContextCurrent(captured))) return { status: 'superseded' };
    if (options.stop?.aborted) return { status: 'stopped' };
    if (options.deadline?.aborted) {
      return { status: 'limited', reason: 'deadline' };
    }
    const status = await writeFetchedRate({
      baseCurrency: captured.baseCurrency,
      quoteCurrency: options.quoteCurrency,
      providerId: captured.providerId ?? '',
      rate,
      effectiveDate,
      replace: options.refresh,
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
    return { status, effectiveDate, fallback: effectiveDate < options.date };
  });
  if (!(await isFxContextCurrent(captured))) return { status: 'superseded' };
  if (
    !options.stop?.aborted &&
    effectiveDate < options.date &&
    (outcome.status === 'inserted' ||
      outcome.status === 'existing' ||
      outcome.status === 'replaced')
  ) {
    remember();
  }
  return finish(outcome);
}

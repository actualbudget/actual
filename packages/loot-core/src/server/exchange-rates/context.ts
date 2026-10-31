import * as storage from '#platform/server/asyncStorage';
import * as connection from '#platform/server/connection';
import { onBudgetClosing } from '#server/mutators';
import * as prefs from '#server/prefs';
import { getServer } from '#server/server-config';
import { getDefaultCurrencyCode } from '#server/util/currency';

export type FxCapture = {
  context: string;
  revision: number;
  budgetId: string;
  baseCurrency: string;
  amountEncoding: string;
  server: string | null;
  token: string;
  providerId: string | null;
  providerVersion: string | null;
};
type ProviderIdentity = { id: string; version: string; fingerprint: string };
type ContextPart = 'open' | 'session' | 'provider' | 'budget';

let active = false;
let closing = true;
let openGeneration = 0;
let sessionGeneration = 0;
let providerGeneration = 0;
let revision = 0;
let provider: ProviderIdentity | null = null;
let observedSession: { server: string | null; token: string } | null = null;
let observedBudget = '';
let sessionBaselinePending = false;
let budgetBaselinePending = false;
let baseCurrency = '';
let amountEncoding = '';
let emitted = '';
const controllers = new Set<AbortController>();
const listeners = new Set<() => void>();

function contextText() {
  return `${openGeneration}.${sessionGeneration}.${providerGeneration}.${baseCurrency}.${amountEncoding}`;
}

function emit() {
  const context = contextText();
  if (context !== emitted) {
    emitted = context;
    connection.send('fx-provider-context', { context });
  }
}

function invalidate(part: ContextPart) {
  revision++;
  if (part === 'provider') {
    providerGeneration++;
  } else if (part === 'session') {
    sessionGeneration++;
    sessionBaselinePending = true;
  } else {
    openGeneration++;
    budgetBaselinePending = true;
  }
  for (const controller of controllers) controller.abort();
  controllers.clear();
  for (const listener of listeners) listener();
}

export async function captureFxContext(): Promise<FxCapture | null> {
  while (active && !closing) {
    const before = revision;
    const metadata = prefs.getPrefs();
    const budgetId = metadata?.id;
    if (!budgetId) return null;
    if (metadata.amountEncodingTransition) {
      invalidate('budget');
      return null;
    }
    const encoding = metadata.amountEncoding ?? '';
    const server = getServer()?.BASE_SERVER ?? null;
    const token = (await storage.getItem('user-token')) ?? '';
    if (!active || closing) return null;
    if (before !== revision) continue;
    const currency = await getDefaultCurrencyCode();
    if (!active || closing) return null;
    if (
      before !== revision ||
      budgetId !== prefs.getPrefs()?.id ||
      encoding !== (prefs.getPrefs()?.amountEncoding ?? '') ||
      server !== (getServer()?.BASE_SERVER ?? null)
    ) {
      continue;
    }
    if (
      (observedSession?.server !== server ||
        observedSession?.token !== token) &&
      !sessionBaselinePending
    ) {
      invalidate('session');
    }
    observedSession = { server, token };
    sessionBaselinePending = false;
    const budget = JSON.stringify([budgetId, currency, encoding]);
    if (budget !== observedBudget && !budgetBaselinePending) {
      invalidate('budget');
    }
    observedBudget = budget;
    budgetBaselinePending = false;
    baseCurrency = currency;
    amountEncoding = encoding;
    emit();
    return {
      context: contextText(),
      revision,
      budgetId,
      baseCurrency: currency,
      amountEncoding: encoding,
      server,
      token,
      providerId: provider?.id ?? null,
      providerVersion: provider?.version ?? null,
    };
  }
  return null;
}

export function startFxContext() {
  active = true;
  closing = false;
  provider = null;
  void notifyFxContextChanged('open');
  const stopClosing = onBudgetClosing(() => {
    if (closing) return;
    closing = true;
    invalidate('open');
    emit();
  });
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    stopClosing();
    active = false;
    closing = true;
    invalidate('open');
    emit();
  };
}

export function onFxContextChanged(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export async function notifyFxContextChanged(part: ContextPart) {
  invalidate(part);
  if (!active || closing) return;
  await captureFxContext();
}

export async function setFxProviderIdentity(
  next: ProviderIdentity | null,
  expected?: FxCapture,
) {
  if (
    expected &&
    (!(await isFxContextCurrent(expected)) || expected.revision !== revision)
  ) {
    return null;
  }
  if (JSON.stringify(provider) !== JSON.stringify(next)) {
    provider = next;
    invalidate('provider');
  }
  const acceptedRevision = revision;
  const captured = await captureFxContext();
  return captured?.revision === acceptedRevision ? captured : null;
}

export function createFxController(capture: FxCapture) {
  const controller = new AbortController();
  if (!isFxCaptureActive(capture)) controller.abort();
  else controllers.add(controller);
  return controller;
}

export function releaseFxController(controller: AbortController) {
  controllers.delete(controller);
}

export async function isFxContextCurrent(capture: FxCapture) {
  const current = await captureFxContext();
  return (
    isFxCaptureActive(capture) &&
    current !== null &&
    current.revision === capture.revision &&
    current.budgetId === capture.budgetId &&
    current.context === capture.context
  );
}

/** Synchronous final guard after asynchronous reads and immediately before writes. */
export function isFxCaptureActive(capture: FxCapture) {
  return active && !closing && capture.revision === revision;
}

import * as connection from '#platform/server/connection';
import { onBudgetClosing } from '#server/mutators';
import * as prefs from '#server/prefs';
import { getDefaultCurrencyCode } from '#server/util/currency';

export type FxCapture = {
  context: string;
  revision: number;
  budgetId: string;
  baseCurrency: string;
  amountEncoding: string;
};

let active = false;
let closing = true;
let openGeneration = 0;
let revision = 0;
let observedBudget = '';
let budgetBaselinePending = false;
let baseCurrency = '';
let amountEncoding = '';
let emitted = '';
const controllers = new Set<AbortController>();
const listeners = new Set<() => void>();

function contextText() {
  return `${openGeneration}.${baseCurrency}.${amountEncoding}`;
}

function emit() {
  const context = contextText();
  if (context !== emitted) {
    emitted = context;
    connection.send('fx-provider-context', { context });
  }
}

function invalidate() {
  revision++;
  openGeneration++;
  budgetBaselinePending = true;
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
      invalidate();
      return null;
    }
    const encoding = metadata.amountEncoding ?? '';
    const currency = await getDefaultCurrencyCode();
    if (!active || closing) return null;
    if (
      before !== revision ||
      budgetId !== prefs.getPrefs()?.id ||
      encoding !== (prefs.getPrefs()?.amountEncoding ?? '')
    ) {
      continue;
    }
    const budget = JSON.stringify([budgetId, currency, encoding]);
    if (budget !== observedBudget && !budgetBaselinePending) {
      invalidate();
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
    };
  }
  return null;
}

export function startFxContext() {
  active = true;
  closing = false;
  void notifyFxContextChanged();
  const stopClosing = onBudgetClosing(() => {
    if (closing) return;
    closing = true;
    invalidate();
    emit();
  });
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    stopClosing();
    active = false;
    closing = true;
    invalidate();
    emit();
  };
}

export function onFxContextChanged(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export async function notifyFxContextChanged() {
  invalidate();
  if (!active || closing) return;
  await captureFxContext();
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

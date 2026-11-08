import {
  getDefaultCurrencyCode,
  isMulticurrencyAvailable,
} from '#server/util/currency';

import { openAccountCurrencies, resolveRate } from './app';
import { ensureRate, providerStatus } from './provider';

/**
 * Fetches today's rate for each open account currency that has no rate for
 * today yet. Saved rates are checked first, so a budget whose rates are
 * already saved never contacts the server. Without a sync server or an
 * installed provider nothing is fetched.
 */
export async function fetchTodayRates(stop: AbortSignal) {
  if (!(await isMulticurrencyAvailable())) return;
  const baseCurrency = await getDefaultCurrencyCode();
  const date = new Date().toISOString().slice(0, 10);
  const missing: string[] = [];
  for (const quoteCurrency of await openAccountCurrencies(baseCurrency)) {
    const local = await resolveRate({
      baseCurrency,
      quoteCurrency,
      date,
      forEntry: false,
    });
    // The same rates ensureRate treats as already saved for the day.
    const saved =
      local.status === 'resolved' &&
      (local.kind === 'explicit' ||
        local.kind === 'dated' ||
        (local.kind === 'fetched' && !local.fallback));
    if (!saved) missing.push(quoteCurrency);
  }
  if (missing.length === 0 || stop.aborted) return;
  // Also records the server's provider, which ensureRate needs.
  const status = await providerStatus();
  if (status.status !== 'ok' || !status.selected) return;
  for (const quoteCurrency of missing) {
    if (stop.aborted) return;
    await ensureRate({ quoteCurrency, date, forEntry: false, stop });
  }
}

/** Runs once when a budget opens; closing it stops any fetch in progress. */
export function startTodayFetch() {
  const controller = new AbortController();
  // A failed fetch leaves the rate missing, as when offline.
  void fetchTodayRates(controller.signal).catch(() => undefined);
  return () => controller.abort();
}

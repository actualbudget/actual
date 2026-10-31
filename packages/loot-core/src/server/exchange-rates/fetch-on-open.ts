import * as db from '#server/db';
import { addSyncListener } from '#server/sync';
import { isMulticurrencyAvailable } from '#server/util/currency';
import * as monthUtils from '#shared/months';

import {
  onMissingRatesFinished,
  startMissingRates,
  stopAutomaticMissingRates,
} from './missing-rates';

const AUTO_UPDATE_PREF = 'exchange-rates-auto-update';
const RETRY_MS = 60 * 60 * 1000;
const DEBOUNCE_MS = 2000;
const DAY_CHECK_MS = 60 * 1000;
// Preferences cover turning multicurrency or a budget currency on.
const WATCHED_TABLES = [
  'accounts',
  'transactions',
  'exchange_rates',
  'preferences',
];

/** Absent means on; only an explicit false turns automatic updates off. */
export async function isAutoUpdateEnabled(): Promise<boolean> {
  const row = await db.first<{ value: string | null }>(
    'SELECT value FROM preferences WHERE id = ?',
    [AUTO_UPDATE_PREF],
  );
  return row?.value !== 'false';
}

/**
 * Keeps daily rates for account history up to date while a budget is open:
 * on open, after each batch of account, transaction, rate or preference changes
 * (local or synced), on local day rollover, and an hour after a failing run
 * or one that left recent days missing. A user Stop
 * holds automatic runs until the next open, local day or toggle; Get missing
 * rates still runs.
 */
export function startMissingRateUpdates() {
  let closed = false;
  let held = false;
  // After five failed lookups, automatic runs wait an hour.
  let failingUntil = 0;
  let enabled: boolean | null = null;
  let day = monthUtils.currentDay();
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const check = async () => {
    if (closed || held || Date.now() < failingUntil) return;
    if (!(await isMulticurrencyAvailable())) return;
    if (!(await isAutoUpdateEnabled())) return;
    if (closed || held) return;
    await startMissingRates({ reason: 'automatic' });
  };
  const schedule = () => {
    clearTimeout(debounce);
    debounce = setTimeout(
      () => void check().catch(() => undefined),
      DEBOUNCE_MS,
    );
  };

  const armRetry = () => {
    clearTimeout(retry);
    retry = setTimeout(() => {
      retry = undefined;
      schedule();
    }, RETRY_MS);
  };

  const stopFinished = onMissingRatesFinished((reason, run) => {
    if (reason === 'user') held = true;
    // A trigger that joined the run may have new ranges: plan again now.
    if (reason === 'done' && run.dirty) {
      schedule();
    }
    // Missing recent days are remembered for an hour; ask again after it.
    else if (reason === 'done' && run.missing > 0) {
      armRetry();
    }
    if (reason === 'failing') {
      failingUntil = Date.now() + RETRY_MS;
      armRetry();
    }
  });
  const stopSync = addSyncListener((_old, newData) => {
    if (newData.has('preferences')) void onPreferenceChange();
    if (WATCHED_TABLES.some(table => newData.has(table))) schedule();
  });
  const onPreferenceChange = async () => {
    const next = await isAutoUpdateEnabled();
    if (next === enabled) return;
    enabled = next;
    held = false;
    if (next) {
      schedule();
    } else {
      // Off cancels automatic demand; a manual run and foreground lookups continue.
      stopAutomaticMissingRates();
    }
  };
  const dayTimer = setInterval(() => {
    const today = monthUtils.currentDay();
    if (today === day) return;
    day = today;
    held = false;
    failingUntil = 0;
    // A run planned yesterday does not cover today; plan again. Its recent
    // misses are remembered for an hour, so ask again after that.
    if (stopAutomaticMissingRates() > 0 && retry === undefined) armRetry();
    schedule();
  }, DAY_CHECK_MS);

  void isAutoUpdateEnabled()
    .then(value => {
      enabled = value;
    })
    .catch(() => undefined);
  schedule();
  return () => {
    closed = true;
    clearTimeout(debounce);
    clearTimeout(retry);
    clearInterval(dayTimer);
    stopSync();
    stopFinished();
  };
}

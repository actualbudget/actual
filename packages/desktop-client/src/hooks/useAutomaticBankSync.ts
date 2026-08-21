import { useEffect, useEffectEvent } from 'react';

import type { AccountEntity } from '@actual-app/core/types/models';

import { useSyncAndDownloadMutation } from '#accounts';
import { useAccounts } from '#hooks/useAccounts';
import { useLocalPref } from '#hooks/useLocalPref';
import { useSyncedPref } from '#hooks/useSyncedPref';

// How often we check whether a sync is due. The configured interval is at least
// an hour, so checking every minute is plenty and keeps the timer cheap.
const CHECK_INTERVAL_MS = 60 * 1000;

const MINUTE_MS = 60 * 1000;

/** Converts the `bank-sync-interval` preference (in minutes) to milliseconds. */
export function parseBankSyncInterval(interval: string | undefined) {
  const minutes = parseInt(interval ?? '0', 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * MINUTE_MS : 0;
}

type IsAutomaticSyncDueArgs = {
  now: number;
  intervalMs: number;
  /** Epoch ms of the last automatic sync attempted by this device. */
  lastAutomaticRun: number | undefined;
  accounts: AccountEntity[];
};

/**
 * Decides whether an automatic bank sync should run right now.
 *
 * The most recent successful sync of any linked account is used as the
 * reference point. Because `last_sync` is synced between devices, manual syncs
 * and syncs performed by other devices also count — so having Actual open on
 * several devices doesn't multiply the number of requests made to the bank.
 */
export function isAutomaticSyncDue({
  now,
  intervalMs,
  lastAutomaticRun,
  accounts,
}: IsAutomaticSyncDueArgs) {
  if (intervalMs <= 0) {
    return false;
  }

  const linkedAccounts = accounts.filter(
    ({ bank, closed, tombstone }) => !!bank && !closed && !tombstone,
  );

  if (linkedAccounts.length === 0) {
    return false;
  }

  // Don't retry immediately if the previous attempt failed — a failed sync
  // never updates `last_sync`, so without this an account that consistently
  // errors would be retried on every check.
  if (lastAutomaticRun != null && now - lastAutomaticRun < intervalMs) {
    return false;
  }

  const lastSync = Math.max(
    0,
    ...linkedAccounts.map(
      ({ last_sync }) => parseInt(last_sync ?? '0', 10) || 0,
    ),
  );

  return now - lastSync >= intervalMs;
}

/**
 * Periodically runs bank sync while the app is open, based on the
 * `bank-sync-interval` preference.
 */
export function useAutomaticBankSync() {
  const [interval] = useSyncedPref('bank-sync-interval');
  const [lastAutomaticRun, setLastAutomaticRun] = useLocalPref(
    'bankSync.lastAutomaticRun',
  );
  const { data: accounts = [] } = useAccounts();
  const syncAndDownload = useSyncAndDownloadMutation();

  const intervalMs = parseBankSyncInterval(interval);

  const maybeSync = useEffectEvent(() => {
    const now = Date.now();

    if (!isAutomaticSyncDue({ now, intervalMs, lastAutomaticRun, accounts })) {
      return;
    }

    setLastAutomaticRun(now);
    syncAndDownload.mutate({});
  });

  useEffect(() => {
    if (intervalMs <= 0) {
      return;
    }

    maybeSync();

    const timer = setInterval(maybeSync, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [intervalMs]);
}

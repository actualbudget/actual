import { useEffect, useEffectEvent, useRef } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useSyncAndDownloadMutation } from '#accounts';
import { sync } from '#app/appSlice';
import { useAccounts } from '#hooks/useAccounts';
import { useLocalPref } from '#hooks/useLocalPref';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { useDispatch } from '#redux';

// How often we check whether a sync is due. A sync can only ever be late by up
// to one check, so this just needs to stay comfortably shorter than
// MIN_CUSTOM_INTERVAL_MINUTES below. Checking every minute keeps the timer
// cheap while staying well inside that.
const CHECK_INTERVAL_MS = 60 * 1000;

const MINUTE_MS = 60 * 1000;

/**
 * Shortest interval the custom interval control will produce. Banks rate-limit
 * how often accounts can be refreshed, and syncing more often than this mostly
 * burns that allowance without returning anything new.
 *
 * Lives here rather than with the control so it sits next to CHECK_INTERVAL_MS:
 * lowering it below that would make syncs land noticeably late.
 */
export const MIN_CUSTOM_INTERVAL_MINUTES = 15;

/** Converts the `bank-sync-interval` preference (in minutes) to milliseconds. */
export function parseBankSyncInterval(interval: string | undefined) {
  const minutes = parseInt(interval ?? '0', 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * MINUTE_MS : 0;
}

type IsAutomaticSyncDueArgs = {
  now: number;
  intervalMs: number;
  /**
   * Epoch ms of the last automatic sync attempted by this device, including
   * one that got no further than syncing the budget.
   */
  lastAutomaticRun: number | undefined;
  accounts: AccountEntity[];
  /** Bank sync goes through the sync server, so it must be reachable. */
  isServerOnline: boolean;
};

/**
 * Decides whether an automatic bank sync should run right now.
 *
 * The *oldest* successful sync across linked accounts is the reference point,
 * so a single account being refreshed does not hold back the others.
 *
 * A sync covers every linked account rather than just the overdue ones, because
 * the underlying sync mutation takes one account or all of them and refuses to
 * run in parallel. So an account that synced recently can be swept along early
 * — bounded at one extra refresh per interval, which is the lesser problem.
 *
 * Because `last_sync` is synced between devices, manual syncs and syncs from
 * other devices still count, so several open devices don't multiply the number
 * of requests made to the bank.
 */
export function isAutomaticSyncDue({
  now,
  intervalMs,
  lastAutomaticRun,
  accounts,
  isServerOnline,
}: IsAutomaticSyncDueArgs) {
  if (intervalMs <= 0) {
    return false;
  }

  if (!isServerOnline) {
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

  // No zero seed here: an account that has never synced parses to 0, which is
  // already the oldest possible value and makes the sync due.
  const oldestSync = Math.min(
    ...linkedAccounts.map(
      ({ last_sync }) => parseInt(last_sync ?? '0', 10) || 0,
    ),
  );

  return now - oldestSync >= intervalMs;
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
  const serverStatus = useSyncServerStatus();

  const intervalMs = parseBankSyncInterval(interval);

  const dispatch = useDispatch();
  const isChecking = useRef(false);

  const maybeSync = useEffectEvent(async () => {
    const now = Date.now();
    const isDue = (candidates: AccountEntity[]) =>
      isAutomaticSyncDue({
        now,
        intervalMs,
        lastAutomaticRun,
        accounts: candidates,
        isServerOnline: serverStatus === 'online',
      });

    if (isChecking.current || !isDue(accounts)) {
      return;
    }

    // The local `last_sync` can be stale: the first check runs before the
    // budget syncs, and the mobile apps wake up with what they had when
    // suspended. Sync and re-check so another device's sync isn't repeated.
    isChecking.current = true;
    try {
      const { error } = await dispatch(sync()).unwrap();
      if (error) {
        // A failed budget sync still counts as an attempt, so it is retried
        // once per interval rather than on every check.
        setLastAutomaticRun(now);
        return;
      }

      if (!isDue(await send('accounts-get'))) {
        return;
      }

      setLastAutomaticRun(now);
      syncAndDownload.mutate({});
    } catch {
      setLastAutomaticRun(now);
    } finally {
      isChecking.current = false;
    }
  });

  // The accounts query starts out with an empty placeholder and the server
  // status is only known once the user data has loaded, so a check on mount
  // alone finds nothing to do. Re-check when these become ready rather than
  // waiting for the next timer tick: the mobile apps suspend the web view in
  // the background, so that tick may never come.
  const isReady =
    intervalMs > 0 && serverStatus === 'online' && accounts.length > 0;

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void maybeSync();

    const timer = setInterval(maybeSync, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isReady]);
}

import { useCallback } from 'react';

import type { AccountEntity } from '@actual-app/core/types/models';

import type { AccountSyncStatus } from '#components/accounts/AccountStatusIndicator';
import { useSelector } from '#redux';

import { isAccountFailedSync } from './syncStatus';

type SyncStatusAccount = Pick<
  AccountEntity,
  'id' | 'bank' | 'bank_sync_status'
>;

/**
 * Returns a function deriving an account's {@link AccountSyncStatus}, backed
 * by the single live in-flight sync state (`state.account.accountsSyncing`)
 * plus the account's persisted `bank_sync_status`. Returned as a function
 * (not a value) so callers can apply it across a list of accounts without
 * calling a hook per iteration.
 */
export function useAccountSyncStatus() {
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);

  return useCallback(
    (account: SyncStatusAccount): AccountSyncStatus => {
      if (!account.bank) return 'manual';
      if (
        // redux drives the live in-flight state (same source as the sidebar
        // spinner); bank_sync_status covers syncs queued elsewhere
        syncingAccountIds.includes(account.id) ||
        account.bank_sync_status === 'pending' ||
        account.bank_sync_status === 'sync-requested'
      ) {
        return 'syncing';
      }
      if (isAccountFailedSync(account)) return 'error';
      return 'synced';
    },
    [syncingAccountIds],
  );
}

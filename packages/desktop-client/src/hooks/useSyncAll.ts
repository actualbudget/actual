import { useMemo, useCallback } from 'react';

import { useAccounts } from './useAccounts';

import { syncAccounts } from '@desktop-client/accounts/accountsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

export function useSyncAll() {
  const accounts = useAccounts();
  const dispatch = useDispatch();
  const { isProcessingQueue } = useSelector(state => state.account);

  // Get linked accounts (accounts that can be synced)
  const linkedAccounts = useMemo(() => {
    return accounts.filter(a => !a.closed && a.account_sync_source);
  }, [accounts]);

  const handleSyncAll = useCallback(() => {
    if (linkedAccounts.length > 0) {
      dispatch(syncAccounts({})); // No id = sync all accounts
    }
  }, [dispatch, linkedAccounts.length]);

  return {
    linkedAccounts,
    handleSyncAll,
    isProcessingQueue,
  };
}

import { send } from '../../platform/client/fetch';
import { getUploadError } from '../../shared/errors';
import { type AppDispatch, type GetRootState } from '../store';

import { syncAccounts } from './account';
import { pushModal } from './modals';
import { loadPrefs } from './prefs';

export function resetSync() {
  return async (dispatch: AppDispatch) => {
    const { error } = await send('sync-reset');

    if (error) {
      alert(getUploadError(error));

      if (
        (error.reason === 'encrypt-failure' &&
          (error.meta as { isMissingKey?: boolean }).isMissingKey) ||
        error.reason === 'file-has-new-key'
      ) {
        dispatch(
          pushModal('fix-encryption-key', {
            onSuccess: () => {
              // TODO: There won't be a loading indicator for this
              dispatch(resetSync());
            },
          }),
        );
      } else if (error.reason === 'encrypt-failure') {
        dispatch(pushModal('create-encryption-key', { recreate: true }));
      }
    } else {
      await dispatch(sync());
    }
  };
}

export function sync() {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      const result = await send('sync');
      if ('error' in result) {
        return { error: result.error };
      }

      // Update the prefs
      await dispatch(loadPrefs());
    }

    return {};
  };
}

export function syncAndDownload(accountId?: string) {
  return async (dispatch: AppDispatch) => {
    // It is *critical* that we sync first because of transaction
    // reconciliation. We want to get all transactions that other
    // clients have already made, so that imported transactions can be
    // reconciled against them. Otherwise, two clients will each add
    // new transactions from the bank and create duplicate ones.
    const syncState = await dispatch(sync());
    if (syncState.error) {
      return { error: syncState.error };
    }

    const hasDownloaded = await dispatch(syncAccounts(accountId));

    if (hasDownloaded) {
      // Sync again afterwards if new transactions were created
      const syncState = await dispatch(sync());
      if (syncState.error) {
        return { error: syncState.error };
      }

      // `hasDownloaded` is already true, we know there has been
      // updates
      return true;
    }
    return { hasUpdated: hasDownloaded };
  };
}

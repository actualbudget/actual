import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from '../../platform/client/fetch';
import { getUploadError } from '../../shared/errors';
import { type AccountEntity } from '../../types/models';
import { type AtLeastOne } from '../../types/util';
import { syncAccounts } from '../accounts/accountsSlice';
import { loadPrefs } from '../actions';
import { pushModal } from '../modals/modalsSlice';
import { createAppAsyncThunk } from '../redux';

const sliceName = 'app';

type AppState = {
  loadingText: string | null;
  updateInfo: {
    version: string;
    releaseDate: string;
    releaseNotes: string;
  } | null;
  showUpdateNotification: boolean;
  managerHasInitialized: boolean;
};

const initialState: AppState = {
  loadingText: null,
  updateInfo: null,
  showUpdateNotification: true,
  managerHasInitialized: false,
};

export const updateApp = createAppAsyncThunk(
  `${sliceName}/updateApp`,
  async (_, { dispatch }) => {
    await global.Actual.applyAppUpdate();
    dispatch(setAppState({ updateInfo: null }));
  },
);

export const resetSync = createAppAsyncThunk(
  `${sliceName}/resetSync`,
  async (_, { dispatch }) => {
    const { error } = await send('sync-reset');

    if (error) {
      alert(getUploadError(error));

      if (
        (error.reason === 'encrypt-failure' &&
          (error.meta as { isMissingKey?: boolean }).isMissingKey) ||
        error.reason === 'file-has-new-key'
      ) {
        dispatch(
          pushModal({
            name: 'fix-encryption-key',
            options: {
              onSuccess: () => {
                // TODO: There won't be a loading indicator for this
                dispatch(resetSync());
              },
            },
          }),
        );
      } else if (error.reason === 'encrypt-failure') {
        dispatch(
          pushModal({
            name: 'create-encryption-key',
            options: { recreate: true },
          }),
        );
      }
    } else {
      await dispatch(sync());
    }
  },
);

export const sync = createAppAsyncThunk(
  `${sliceName}/sync`,
  async (_, { dispatch, getState }) => {
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
  },
);

type SyncAndDownloadPayload = {
  accountId?: AccountEntity['id'] | string;
};

export const syncAndDownload = createAppAsyncThunk(
  `${sliceName}/syncAndDownload`,
  async ({ accountId }: SyncAndDownloadPayload, { dispatch }) => {
    // It is *critical* that we sync first because of transaction
    // reconciliation. We want to get all transactions that other
    // clients have already made, so that imported transactions can be
    // reconciled against them. Otherwise, two clients will each add
    // new transactions from the bank and create duplicate ones.
    const syncState = await dispatch(sync()).unwrap();
    if (syncState.error) {
      return { error: syncState.error };
    }

    const hasDownloaded = await dispatch(syncAccounts({ id: accountId }));

    if (hasDownloaded) {
      // Sync again afterwards if new transactions were created
      const syncState = await dispatch(sync()).unwrap();
      if (syncState.error) {
        return { error: syncState.error };
      }

      // `hasDownloaded` is already true, we know there has been
      // updates
      return true;
    }
    return { hasUpdated: hasDownloaded };
  },
);

// Workaround for partial types in actions.
// https://github.com/reduxjs/redux-toolkit/issues/1423#issuecomment-902680573
type SetAppStatePayload = AtLeastOne<AppState>;

const appSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    setAppState(state, action: PayloadAction<SetAppStatePayload>) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
});

export const { name, reducer, getInitialState } = appSlice;

export const actions = {
  ...appSlice.actions,
  updateApp,
  resetSync,
  sync,
  syncAndDownload,
};

export const { setAppState } = actions;

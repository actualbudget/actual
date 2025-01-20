import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from '../../platform/client/fetch';
import { getUploadError } from '../../shared/errors';
import { type AccountEntity } from '../../types/models';
import { syncAccounts } from '../accounts/accountsSlice';
import { loadPrefs, pushModal } from '../actions';
import { createAppAsyncThunk } from '../redux';
import { enUS } from 'date-fns/locale';

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
  locale: Locale;
};

const initialState: AppState = {
  loadingText: null,
  updateInfo: null,
  showUpdateNotification: true,
  managerHasInitialized: false,
  locale: enUS
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

export const fetchLocale = createAppAsyncThunk(
  'app/fetchLocale',
  async ({ language }: { language: string }, {}) => {
    try {
      const localeModule = await import(/* @vite-ignore */ `date-fns/locale`);

      if(localeModule[language.replace('-', '')]) { 
        return localeModule[language.replace('-', '')]
      } else {
          return enUS;
      }
      
      // return localeModule.default;
    } catch (error) {
      console.error(`Locale for language "${language}" not found. Falling back to default.`);
      return enUS;
    }
  }
);


type SetAppStatePayload = Partial<AppState>;

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
  extraReducers: (builder) => {
    builder.addCase(fetchLocale.fulfilled, (state, action) => {
      state.locale = action.payload; // Update the locale when loaded
    });
  },
});


export const { name, reducer, getInitialState } = appSlice;

export const actions = {
  ...appSlice.actions,
  updateApp,
  resetSync,
  sync,
  syncAndDownload,
  fetchLocale
};

export const { setAppState } = actions;

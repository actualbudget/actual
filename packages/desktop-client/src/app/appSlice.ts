import { createAction, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/connection';
import { getUploadError } from 'loot-core/shared/errors';
import type { AtLeastOne } from 'loot-core/types/util';

import { pushModal } from '@desktop-client/modals/modalsSlice';
import { loadPrefs } from '@desktop-client/prefs/prefsSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';
import { getIsOutdated, getLatestVersion } from '@desktop-client/util/versions';

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
  versionInfo: {
    latestVersion: string;
    isOutdated: boolean;
  } | null;
};

const initialState: AppState = {
  loadingText: null,
  updateInfo: null,
  showUpdateNotification: true,
  managerHasInitialized: false,
  versionInfo: null,
};

export const resetApp = createAction(`${sliceName}/resetApp`);

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
            modal: {
              name: 'fix-encryption-key',
              options: {
                onSuccess: () => {
                  // TODO: There won't be a loading indicator for this
                  void dispatch(resetSync());
                },
              },
            },
          }),
        );
      } else if (error.reason === 'encrypt-failure') {
        dispatch(
          pushModal({
            modal: {
              name: 'create-encryption-key',
              options: { recreate: true },
            },
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
      if (result && 'error' in result) {
        return { error: result.error };
      }

      // Update the prefs
      await dispatch(loadPrefs());
    }

    return {};
  },
);

export const getLatestAppVersion = createAppAsyncThunk(
  `${sliceName}/getLatestAppVersion`,
  async (_, { dispatch, getState }) => {
    const globalPrefs = getState().prefs.global;
    if (globalPrefs && globalPrefs.notifyWhenUpdateIsAvailable) {
      const theLatestVersion = await getLatestVersion();
      dispatch(
        setAppState({
          versionInfo: {
            latestVersion: theLatestVersion,
            isOutdated: getIsOutdated(theLatestVersion),
          },
        }),
      );
    }

    return;
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
  extraReducers: builder => {
    builder.addCase(resetApp, state => ({
      ...initialState,
      loadingText: state.loadingText || null,
      managerHasInitialized: state.managerHasInitialized || false,
    }));
  },
});

export const { name, reducer, getInitialState } = appSlice;

export const actions = {
  ...appSlice.actions,
  resetApp,
  updateApp,
  resetSync,
  sync,
  getLatestAppVersion,
};

export const { setAppState } = actions;

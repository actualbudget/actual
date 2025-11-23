import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/fetch';
import { type GlobalSyncedPrefs } from 'loot-core/types/prefs';

import { createAppAsyncThunk } from '@desktop-client/redux';
import { getUserData } from '@desktop-client/users/usersSlice';

const sliceName = 'globalSyncedPrefs';

type GlobalSyncedPrefsState = GlobalSyncedPrefs;

const initialState: GlobalSyncedPrefsState = {};

const globalSyncedPrefsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    mergeGlobalSyncedPrefs(state, action: PayloadAction<GlobalSyncedPrefs>) {
      return {
        ...state,
        ...action.payload,
      };
    },
  },
  extraReducers: builder => {
    builder.addCase(getUserData.fulfilled, (state, action) => {
      if (!action.payload || typeof action.payload !== 'object') {
        return state;
      }

      const { globalSyncedPrefs } = action.payload as {
        globalSyncedPrefs?: GlobalSyncedPrefs | null;
      };

      if (!globalSyncedPrefs) {
        return state;
      }

      return {
        ...state,
        ...globalSyncedPrefs,
      };
    });
  },
});

type SaveGlobalSyncedPrefsPayload = {
  prefs: GlobalSyncedPrefs;
};

export const saveGlobalSyncedPrefs = createAppAsyncThunk(
  `${sliceName}/saveGlobalSyncedPrefs`,
  async ({ prefs }: SaveGlobalSyncedPrefsPayload, { dispatch }) => {
    await send('save-server-prefs', { prefs });
    dispatch(mergeGlobalSyncedPrefs(prefs));
  },
);

export const { name, reducer, getInitialState } = globalSyncedPrefsSlice;

export const actions = {
  ...globalSyncedPrefsSlice.actions,
  saveGlobalSyncedPrefs,
};

export const { mergeGlobalSyncedPrefs } = actions;

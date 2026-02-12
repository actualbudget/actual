import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/fetch';
import type { ServerPrefs } from 'loot-core/types/prefs';

import { resetApp } from '@desktop-client/app/appSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';
import { getUserData } from '@desktop-client/users/usersSlice';

const sliceName = 'prefs';

type PrefsState = {
  server: ServerPrefs;
};

const initialState: PrefsState = {
  server: {},
};
type SaveServerPrefsPayload = {
  prefs: ServerPrefs;
};

export const saveServerPrefs = createAppAsyncThunk(
  `${sliceName}/saveServerPrefs`,
  async ({ prefs }: SaveServerPrefsPayload, { dispatch }) => {
    const result = await send('save-server-prefs', { prefs });
    if (result && 'error' in result) {
      return { error: result.error };
    }

    dispatch(mergeServerPrefs(prefs));
    return {};
  },
);

type MergeServerPrefsPayload = ServerPrefs;

const prefsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    mergeServerPrefs(state, action: PayloadAction<MergeServerPrefsPayload>) {
      state.server = { ...state.server, ...action.payload };
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, state => ({
      ...initialState,
      server: state.server || initialState.server,
    }));
    builder.addCase(getUserData.fulfilled, (state, action) => {
      if (!action.payload || typeof action.payload !== 'object') {
        return state;
      }

      const { serverPrefs } = action.payload as {
        serverPrefs?: ServerPrefs | null;
      };

      if (!serverPrefs) {
        return state;
      }

      state.server = {
        ...state.server,
        ...serverPrefs,
      };
    });
  },
});

export const { name, reducer, getInitialState } = prefsSlice;

export const actions = {
  ...prefsSlice.actions,
  saveServerPrefs,
};

export const { mergeServerPrefs } = actions;

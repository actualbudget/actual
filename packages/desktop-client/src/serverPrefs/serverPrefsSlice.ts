import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/fetch';
import { type ServerPrefs } from 'loot-core/types/prefs';

import { createAppAsyncThunk } from '@desktop-client/redux';
import { getUserData } from '@desktop-client/users/usersSlice';

const sliceName = 'serverPrefs';

type ServerPrefsState = ServerPrefs;

const initialState: ServerPrefsState = {};

const serverPrefsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    mergeServerPrefs(state, action: PayloadAction<ServerPrefs>) {
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

      const { serverPrefs } = action.payload as {
        serverPrefs?: ServerPrefs | null;
      };

      if (!serverPrefs) {
        return state;
      }

      return {
        ...state,
        ...serverPrefs,
      };
    });
  },
});

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

export const { name, reducer, getInitialState } = serverPrefsSlice;

export const actions = {
  ...serverPrefsSlice.actions,
  saveServerPrefs,
};

export const { mergeServerPrefs } = actions;

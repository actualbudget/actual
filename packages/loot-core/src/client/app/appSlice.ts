import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type AtLeastOne } from '../../types/util';
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
  async (_, thunkApi) => {
    await global.Actual.applyAppUpdate();
    thunkApi.dispatch(setAppState({ updateInfo: null }));
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
};

export const { setAppState } = actions;

import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import { type AppDispatch, type RootState } from '../store';

const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
}>();

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
  'app/updateApp',
  async (_, thunkApi) => {
    await global.Actual.applyAppUpdate();
    thunkApi.dispatch(setAppState({ updateInfo: null }));
  },
);

type SetAppStatePayload = Partial<AppState>;

const appSlice = createSlice({
  name: 'app',
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

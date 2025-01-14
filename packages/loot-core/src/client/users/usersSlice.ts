import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from '../../platform/client/fetch';
import { type Handlers } from '../../types/handlers';
import { closeBudget, loadAllFiles } from '../budgets/budgetsSlice';
import { loadGlobalPrefs } from '../prefs/prefsSlice';
import { createAppAsyncThunk } from '../redux';

const sliceName = 'user';

export const getUserData = createAppAsyncThunk(
  `${sliceName}/getUserData`,
  async (_, { dispatch }) => {
    const data = await send('subscribe-get-user');
    dispatch(loadUserData({ data }));
    return data;
  },
);

export const loggedIn = createAppAsyncThunk(
  `${sliceName}/getUserData`,
  async (_, { dispatch }) => {
    await dispatch(getUserData());

    // We want to be careful about how we call loadAllFiles. It will
    // turn the files state from null into an array, indicating that
    // we've loaded the files at least once. This first attempt at
    // loading files is important - the manager uses files to decide
    // if it should create a new file automatically (if there are no
    // files). If we call it before we have a properly logged in
    // user, later on it could trigger the codepath which
    // automatically creates a file, but we really haven't loaded
    // their files yet.
    //
    // Since the above comment was written, We let in users even if
    // their account is invalid. So we should list all their files
    // regardless. Previously, we kicked users out to a "need payment
    // info" screen and we didn't want to call this.
    dispatch(loadAllFiles());
  },
);

export const signOut = createAppAsyncThunk(
  `${sliceName}/signOut`,
  async (_, { dispatch }) => {
    await send('subscribe-sign-out');

    dispatch(getUserData());
    dispatch(loadGlobalPrefs());
    dispatch(closeBudget());
    // Handled in budgetSlice
    // dispatch({ type: constants.SIGN_OUT });
  },
);

type UsersState = {
  data: Awaited<ReturnType<Handlers['subscribe-get-user']>>;
};

const initialState: UsersState = {
  data: null,
};

type GetUserDataPayload = {
  data: UsersState['data'];
};

const usersSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    loadUserData(state, action: PayloadAction<GetUserDataPayload>) {
      state.data = action.payload.data;
    },
  },
});

export const { name, reducer, getInitialState } = usersSlice;

export const actions = {
  ...usersSlice.actions,
  getUserData,
  loggedIn,
  signOut,
};

export const { loadUserData } = actions;

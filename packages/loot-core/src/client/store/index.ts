import { combineReducers, configureStore } from '@reduxjs/toolkit';

import * as constants from '../constants';
import { reducers } from '../reducers';
import { initialState as initialAccountState } from '../reducers/account';
import { initialState as initialAppState } from '../reducers/app';
import { initialState as initialBudgetsState } from '../reducers/budgets';
import { initialState as initialModalsState } from '../reducers/modals';
import { initialState as initialNotificationsState } from '../reducers/notifications';
import { initialState as initialPrefsState } from '../reducers/prefs';
import { initialState as initialQueriesState } from '../reducers/queries';
import { initialState as initialUserState } from '../reducers/user';

const appReducer = combineReducers(reducers);
const rootReducer: typeof appReducer = (state, action) => {
  if (action.type === constants.CLOSE_BUDGET) {
    // Reset the state and only keep around things intentionally. This
    // blows away everything else
    state = {
      account: initialAccountState,
      modals: initialModalsState,
      notifications: initialNotificationsState,
      queries: initialQueriesState,
      budgets: state?.budgets || initialBudgetsState,
      user: state?.user || initialUserState,
      prefs: {
        local: initialPrefsState.local,
        global: state?.prefs?.global || initialPrefsState.global,
        synced: initialPrefsState.synced,
      },
      app: {
        ...initialAppState,
        managerHasInitialized: state?.app?.managerHasInitialized || false,
        loadingText: state?.app?.loadingText || null,
      },
    };
  }

  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // TODO: Fix this in a separate PR. Remove non-serializable states in the store.
      serializableCheck: false,
    }),
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type GetRootState = typeof store.getState;

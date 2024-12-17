import { combineReducers, configureStore } from '@reduxjs/toolkit';

import * as constants from '../constants';
import { reducers } from '../reducers';
import { initialState as initialAppState } from '../reducers/app';

const appReducer = combineReducers(reducers);
const rootReducer: typeof appReducer = (state, action) => {
  if (action.type === constants.CLOSE_BUDGET) {
    // Reset the state and only keep around things intentionally. This
    // blows away everything else
    state = {
      account: null,
      modals: null,
      notifications: null,
      queries: null,
      budgets: state.budgets,
      user: state.user,
      prefs: { local: null, global: state.prefs.global, synced: null },
      app: {
        ...initialAppState,
        managerHasInitialized: state.app.managerHasInitialized,
        loadingText: state.app.loadingText,
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

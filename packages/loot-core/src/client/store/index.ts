import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isRejected,
} from '@reduxjs/toolkit';

import {
  name as accountsSliceName,
  reducer as accountsSliceReducer,
  getInitialState as getInitialAccountsState,
} from '../accounts/accountsSlice';
import {
  name as appSliceName,
  reducer as appSliceReducer,
  getInitialState as getInitialAppState,
} from '../app/appSlice';
import {
  name as budgetsSliceName,
  reducer as budgetsSliceReducer,
  getInitialState as getInitialBudgetsState,
} from '../budgets/budgetsSlice';
import * as constants from '../constants';
import {
  name as modalsSliceName,
  reducer as modalsSliceReducer,
  getInitialState as getInitialModalsState,
} from '../modals/modalsSlice';
import {
  name as notificationsSliceName,
  reducer as notificationsSliceReducer,
  getInitialState as getInitialNotificationsState,
  addNotification,
} from '../notifications/notificationsSlice';
import {
  name as queriesSliceName,
  reducer as queriesSliceReducer,
  getInitialState as getInitialQueriesState,
} from '../queries/queriesSlice';
import { reducers } from '../reducers';
import { initialState as initialPrefsState } from '../reducers/prefs';
import { initialState as initialUserState } from '../reducers/user';

const appReducer = combineReducers({
  ...reducers,
  [accountsSliceName]: accountsSliceReducer,
  [appSliceName]: appSliceReducer,
  [budgetsSliceName]: budgetsSliceReducer,
  [modalsSliceName]: modalsSliceReducer,
  [notificationsSliceName]: notificationsSliceReducer,
  [queriesSliceName]: queriesSliceReducer,
});
const rootReducer: typeof appReducer = (state, action) => {
  if (action.type === constants.CLOSE_BUDGET) {
    // Reset the state and only keep around things intentionally. This
    // blows away everything else
    state = {
      account: getInitialAccountsState(),
      modals: getInitialModalsState(),
      notifications: getInitialNotificationsState(),
      queries: getInitialQueriesState(),
      budgets: state?.budgets || getInitialBudgetsState(),
      user: state?.user || initialUserState,
      prefs: {
        local: initialPrefsState.local,
        global: state?.prefs?.global || initialPrefsState.global,
        synced: initialPrefsState.synced,
      },
      app: {
        ...getInitialAppState(),
        managerHasInitialized: state?.app?.managerHasInitialized || false,
        loadingText: state?.app?.loadingText || null,
      },
    };
  }

  return appReducer(state, action);
};

const notifyOnRejectedActionsMiddleware = createListenerMiddleware();
notifyOnRejectedActionsMiddleware.startListening({
  matcher: isRejected,
  effect: (action, { dispatch }) => {
    console.error(action.error);
    dispatch(
      addNotification({
        notification: {
          id: action.type,
          type: 'error',
          message: action.error.message || 'An unexpected error occurred.',
        },
      }),
    );
  },
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // TODO: Fix this in a separate PR. Remove non-serializable states in the store.
      serializableCheck: false,
    }).prepend(notifyOnRejectedActionsMiddleware.middleware),
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type GetRootState = typeof store.getState;

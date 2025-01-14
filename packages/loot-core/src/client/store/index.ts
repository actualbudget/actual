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
  name as prefsSliceName,
  reducer as prefsSliceReducer,
  getInitialState as getInitialPrefsState,
} from '../prefs/prefsSlice';
import {
  name as queriesSliceName,
  reducer as queriesSliceReducer,
  getInitialState as getInitialQueriesState,
} from '../queries/queriesSlice';
import {
  name as usersSliceName,
  reducer as usersSliceReducer,
  getInitialState as getInitialUsersState,
} from '../users/usersSlice';

const appReducer = combineReducers({
  [accountsSliceName]: accountsSliceReducer,
  [appSliceName]: appSliceReducer,
  [budgetsSliceName]: budgetsSliceReducer,
  [modalsSliceName]: modalsSliceReducer,
  [notificationsSliceName]: notificationsSliceReducer,
  [prefsSliceName]: prefsSliceReducer,
  [queriesSliceName]: queriesSliceReducer,
  [usersSliceName]: usersSliceReducer,
});

export const CLOSE_BUDGET = 'CLOSE_BUDGET';

const rootReducer: typeof appReducer = (state, action) => {
  if (action.type === CLOSE_BUDGET) {
    // Reset the state and only keep around things intentionally. This
    // blows away everything else
    state = {
      account: getInitialAccountsState(),
      modals: getInitialModalsState(),
      notifications: getInitialNotificationsState(),
      queries: getInitialQueriesState(),
      budgets: state?.budgets || getInitialBudgetsState(),
      user: state?.user || getInitialUsersState(),
      prefs: {
        ...getInitialPrefsState(),
        global: state?.prefs?.global || getInitialPrefsState().global,
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

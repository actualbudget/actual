import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isRejected,
} from '@reduxjs/toolkit';

import {
  name as accountsSliceName,
  reducer as accountsSliceReducer,
} from '@desktop-client/accounts/accountsSlice';
import {
  name as appSliceName,
  reducer as appSliceReducer,
} from '@desktop-client/app/appSlice';
import {
  name as budgetSliceName,
  reducer as budgetSliceReducer,
} from '@desktop-client/budget/budgetSlice';
import {
  name as budgetfilesSliceName,
  reducer as budgetfilesSliceReducer,
} from '@desktop-client/budgetfiles/budgetfilesSlice';
import {
  name as modalsSliceName,
  reducer as modalsSliceReducer,
} from '@desktop-client/modals/modalsSlice';
import {
  name as notificationsSliceName,
  reducer as notificationsSliceReducer,
  addNotification,
} from '@desktop-client/notifications/notificationsSlice';
import {
  name as payeesSliceName,
  reducer as payeesSliceReducer,
} from '@desktop-client/payees/payeesSlice';
import {
  name as prefsSliceName,
  reducer as prefsSliceReducer,
} from '@desktop-client/prefs/prefsSlice';
import {
  name as tagsSliceName,
  reducer as tagsSliceReducer,
} from '@desktop-client/tags/tagsSlice';
import {
  name as transactionsSliceName,
  reducer as transactionsSliceReducer,
} from '@desktop-client/transactions/transactionsSlice';
import {
  name as usersSliceName,
  reducer as usersSliceReducer,
} from '@desktop-client/users/usersSlice';

const rootReducer = combineReducers({
  [accountsSliceName]: accountsSliceReducer,
  [appSliceName]: appSliceReducer,
  [budgetSliceName]: budgetSliceReducer,
  [budgetfilesSliceName]: budgetfilesSliceReducer,
  [modalsSliceName]: modalsSliceReducer,
  [notificationsSliceName]: notificationsSliceReducer,
  [payeesSliceName]: payeesSliceReducer,
  [prefsSliceName]: prefsSliceReducer,
  [transactionsSliceName]: transactionsSliceReducer,
  [tagsSliceName]: tagsSliceReducer,
  [usersSliceName]: usersSliceReducer,
});

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

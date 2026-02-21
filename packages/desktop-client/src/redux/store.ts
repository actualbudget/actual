import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isRejected,
} from '@reduxjs/toolkit';
import type { QueryClient } from '@tanstack/react-query';

import {
  name as accountsSliceName,
  reducer as accountsSliceReducer,
} from '@desktop-client/accounts/accountsSlice';
import {
  name as appSliceName,
  reducer as appSliceReducer,
} from '@desktop-client/app/appSlice';
import {
  name as budgetfilesSliceName,
  reducer as budgetfilesSliceReducer,
} from '@desktop-client/budgetfiles/budgetfilesSlice';
import {
  name as modalsSliceName,
  reducer as modalsSliceReducer,
} from '@desktop-client/modals/modalsSlice';
import {
  addNotification,
  name as notificationsSliceName,
  reducer as notificationsSliceReducer,
} from '@desktop-client/notifications/notificationsSlice';
import {
  name as prefsSliceName,
  reducer as prefsSliceReducer,
} from '@desktop-client/prefs/prefsSlice';
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
  [budgetfilesSliceName]: budgetfilesSliceReducer,
  [modalsSliceName]: modalsSliceReducer,
  [notificationsSliceName]: notificationsSliceReducer,
  [prefsSliceName]: prefsSliceReducer,
  [transactionsSliceName]: transactionsSliceReducer,
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

export function configureAppStore({
  queryClient,
}: {
  queryClient: QueryClient;
}) {
  return configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        // TODO: Fix this in a separate PR. Remove non-serializable states in the store.
        serializableCheck: false,
        thunk: {
          extraArgument: { queryClient } as ExtraArguments,
        },
      }).prepend(notifyOnRejectedActionsMiddleware.middleware),
  });
}

export type AppStore = ReturnType<typeof configureAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type GetRootState = AppStore['getState'];
export type ExtraArguments = {
  queryClient: QueryClient;
};

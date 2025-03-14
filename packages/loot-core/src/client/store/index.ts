import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isRejected,
} from '@reduxjs/toolkit';

import {
  name as accountsSliceName,
  reducer as accountsSliceReducer,
} from '../accounts/accountsSlice';
import {
  name as appSliceName,
  reducer as appSliceReducer,
} from '../app/appSlice';
import {
  name as budgetsSliceName,
  reducer as budgetsSliceReducer,
} from '../budgets/budgetsSlice';
import {
  name as modalsSliceName,
  reducer as modalsSliceReducer,
} from '../modals/modalsSlice';
import {
  name as notificationsSliceName,
  reducer as notificationsSliceReducer,
  addNotification,
} from '../notifications/notificationsSlice';
import {
  name as prefsSliceName,
  reducer as prefsSliceReducer,
} from '../prefs/prefsSlice';
import {
  name as queriesSliceName,
  reducer as queriesSliceReducer,
} from '../queries/queriesSlice';
import {
  name as usersSliceName,
  reducer as usersSliceReducer,
} from '../users/usersSlice';

const rootReducer = combineReducers({
  [accountsSliceName]: accountsSliceReducer,
  [appSliceName]: appSliceReducer,
  [budgetsSliceName]: budgetsSliceReducer,
  [modalsSliceName]: modalsSliceReducer,
  [notificationsSliceName]: notificationsSliceReducer,
  [prefsSliceName]: prefsSliceReducer,
  [queriesSliceName]: queriesSliceReducer,
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

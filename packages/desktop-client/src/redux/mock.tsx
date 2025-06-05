import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';

import { configureStore, combineReducers } from '@reduxjs/toolkit';

import { type store as realStore } from './store';

import {
  name as accountsSliceName,
  reducer as accountsSliceReducer,
} from '@desktop-client/accounts/accountsSlice';
import {
  name as appSliceName,
  reducer as appSliceReducer,
} from '@desktop-client/app/appSlice';
import {
  name as budgetsSliceName,
  reducer as budgetsSliceReducer,
} from '@desktop-client/budgets/budgetsSlice';
import {
  name as modalsSliceName,
  reducer as modalsSliceReducer,
} from '@desktop-client/modals/modalsSlice';
import {
  name as notificationsSliceName,
  reducer as notificationsSliceReducer,
} from '@desktop-client/notifications/notificationsSlice';
import {
  name as prefsSliceName,
  reducer as prefsSliceReducer,
} from '@desktop-client/prefs/prefsSlice';
import {
  name as queriesSliceName,
  reducer as queriesSliceReducer,
} from '@desktop-client/queries/queriesSlice';
import {
  name as usersSliceName,
  reducer as usersSliceReducer,
} from '@desktop-client/users/usersSlice';

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

export let mockStore: typeof realStore = configureStore({
  reducer: appReducer,
});

export function resetMockStore() {
  mockStore = configureStore({
    reducer: appReducer,
  });
}

export function TestProvider({ children }: { children: ReactNode }) {
  return <Provider store={mockStore}>{children}</Provider>;
}

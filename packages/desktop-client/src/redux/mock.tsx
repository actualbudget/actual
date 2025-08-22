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

const appReducer = combineReducers({
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

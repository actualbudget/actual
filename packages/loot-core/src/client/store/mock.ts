import { configureStore, combineReducers } from '@reduxjs/toolkit';

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
  name as queriesSliceName,
  reducer as queriesSliceReducer,
} from '../queries/queriesSlice';
import { reducers } from '../reducers';

import { type store as realStore } from './index';

const appReducer = combineReducers({
  ...reducers,
  [accountsSliceName]: accountsSliceReducer,
  [appSliceName]: appSliceReducer,
  [budgetsSliceName]: budgetsSliceReducer,
  [queriesSliceName]: queriesSliceReducer,
});

export let mockStore: typeof realStore = configureStore({
  reducer: appReducer,
});

export function resetMockStore() {
  mockStore = configureStore({
    reducer: appReducer,
  });
}

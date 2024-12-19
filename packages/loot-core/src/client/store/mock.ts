import { configureStore, combineReducers } from '@reduxjs/toolkit';

import {
  name as accountsSliceName,
  reducer as accountsSliceReducer,
} from '../accounts/accountsSlice';
import {
  name as queriesSliceName,
  reducer as qeriesSliceReducer,
} from '../queries/queriesSlice';
import { reducers } from '../reducers';

import { type store as realStore } from './index';

const appReducer = combineReducers({
  ...reducers,
  [accountsSliceName]: accountsSliceReducer,
  [queriesSliceName]: qeriesSliceReducer,
});

export let mockStore: typeof realStore = configureStore({
  reducer: appReducer,
});

export function resetMockStore() {
  mockStore = configureStore({
    reducer: appReducer,
  });
}

import { configureStore, combineReducers } from '@reduxjs/toolkit';

import {
  name as accountSliceName,
  reducer as accountSliceReducer,
} from '../accounts/accountsSlice';
import { reducers } from '../reducers';

import { type store as realStore } from './index';

const appReducer = combineReducers({
  ...reducers,
  [accountSliceName]: accountSliceReducer,
});

export let mockStore: typeof realStore = configureStore({
  reducer: appReducer,
});

export function resetMockStore() {
  mockStore = configureStore({
    reducer: appReducer,
  });
}

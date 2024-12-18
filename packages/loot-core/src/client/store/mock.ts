import { configureStore, combineReducers } from '@reduxjs/toolkit';

import { reducers } from '../reducers';

import { type store as realStore } from './index';

const appReducer = combineReducers(reducers);

export let mockStore: typeof realStore = configureStore({
  reducer: appReducer,
});

export function resetMockStore() {
  mockStore = configureStore({
    reducer: appReducer,
  });
}

import { configureStore, combineReducers } from '@reduxjs/toolkit';

import { reducers } from '../reducers';

const appReducer = combineReducers(reducers);

export let store = null;

export function resetStore() {
  store = configureStore({
    reducer: appReducer,
  });
}

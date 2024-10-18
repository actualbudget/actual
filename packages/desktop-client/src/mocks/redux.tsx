// @ts-strict-ignore
import React from 'react';
import { Provider } from 'react-redux';

import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import { reducers } from '../state';

const appReducer = combineReducers(reducers);
let store;

export function resetStore() {
  store = createStore(appReducer, undefined, applyMiddleware(thunk /* log */));
}

resetStore();

export function TestProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}

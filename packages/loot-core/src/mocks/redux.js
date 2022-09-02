import React from 'react';
import { Provider } from 'react-redux';

import thunk from 'redux-thunk';
import { createStore, combineReducers, applyMiddleware } from 'redux';

import reducers from '../client/reducers';

let appReducer = combineReducers(reducers);
let store = null;

export function resetStore() {
  store = createStore(appReducer, undefined, applyMiddleware(thunk /* log */));
}

resetStore();

export function TestProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}

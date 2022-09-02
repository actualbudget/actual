// This file will initialize the app if we are in a real browser
// environment (not electron)
import './browser-preload';

// A hack for now: this makes sure it's appended before glamor
import '@reach/listbox/styles.css';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import {
  createStore,
  combineReducers,
  applyMiddleware,
  bindActionCreators
} from 'redux';
import thunk from 'redux-thunk';

import constants from 'loot-core/src/client/constants';
import reducers from 'loot-core/src/client/reducers';
import { send } from 'loot-core/src/platform/client/fetch';
import q, { runQuery } from 'loot-core/src/client/query-helpers';
import * as actions from 'loot-core/src/client/actions';
import { initialState as initialAppState } from 'loot-core/src/client/reducers/app';

import { handleGlobalEvents } from './global-events';
import App from './components/App';

// See https://github.com/WICG/focus-visible. Only makes the blue
// focus outline appear from keyboard events.
require('focus-visible');

function lightweightStringify(obj) {
  return JSON.stringify(obj, function(k, v) {
    return k ? '' + v : v;
  });
}

function log() {
  return next => action => {
    if (window.Actual.IS_DEV) {
      console.log(action);
    }

    if (window.SentryClient) {
      window.SentryClient.addBreadcrumb({
        message: lightweightStringify(action).slice(0, 500),
        category: 'redux',
        level: 'info'
      });
    }

    return next(action);
  };
}

const appReducer = combineReducers(reducers);
function rootReducer(state, action) {
  if (action.type === constants.CLOSE_BUDGET) {
    // Reset the state and only keep around things intentionally. This
    // blows away everything else
    state = {
      budgets: state.budgets,
      user: state.user,
      prefs: { local: null, global: state.prefs.global },
      app: {
        ...initialAppState,
        updateInfo: state.updateInfo,
        showUpdateNotification: state.showUpdateNotification,
        managerHasInitialized: state.app.managerHasInitialized,
        loadingText: state.app.loadingText
      }
    };
  }

  return appReducer(state, action);
}

const store = createStore(
  rootReducer,
  undefined,
  applyMiddleware(thunk /*log*/)
);
const boundActions = bindActionCreators(actions, store.dispatch);

// Listen for global events from the server or main process
handleGlobalEvents(boundActions, store);

// Expose this to the main process to menu items can access it
window.__actionsForMenu = boundActions;

// Expose send for fun!
window.$send = send;
window.$query = runQuery;
window.$q = q;

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);

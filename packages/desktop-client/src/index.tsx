// This file will initialize the app if we are in a real browser
// environment (not electron)
import './browser-preload';

// A hack for now: this makes sure it's appended before glamor
import '@reach/listbox/styles.css';

import './fonts.scss';

import React from 'react';
import { Provider } from 'react-redux';

import { createRoot } from 'react-dom/client';
import {
  createStore,
  combineReducers,
  applyMiddleware,
  bindActionCreators,
} from 'redux';
import thunk from 'redux-thunk';

import * as actions from 'loot-core/src/client/actions';
import * as constants from 'loot-core/src/client/constants';
import q, { runQuery } from 'loot-core/src/client/query-helpers';
import reducers from 'loot-core/src/client/reducers';
import { initialState as initialAppState } from 'loot-core/src/client/reducers/app';
import { send } from 'loot-core/src/platform/client/fetch';

import App from './components/App';
import { ServerProvider } from './components/ServerContext';
import { handleGlobalEvents } from './global-events';

// See https://github.com/WICG/focus-visible. Only makes the blue
// focus outline appear from keyboard events.
import 'focus-visible';

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
        loadingText: state.app.loadingText,
      },
    };
  }

  return appReducer(state, action);
}

const store = createStore(rootReducer, undefined, applyMiddleware(thunk));
const boundActions = bindActionCreators(actions, store.dispatch);

// Listen for global events from the server or main process
handleGlobalEvents(boundActions, store);

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __actionsForMenu: typeof actions;

    $send: typeof send;
    $query: typeof runQuery;
    $q: typeof q;
  }
}

// Expose this to the main process to menu items can access it
window.__actionsForMenu = boundActions;

// Expose send for fun!
window.$send = send;
window.$query = runQuery;
window.$q = q;

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <ServerProvider>
      <App />
    </ServerProvider>
  </Provider>,
);

import React from 'react';
import { Provider } from 'react-redux';
import {
  createStore,
  combineReducers,
  applyMiddleware,
  bindActionCreators
} from 'redux';
import thunk from 'redux-thunk';
import reducers from 'loot-core/src/client/reducers';
import constants from 'loot-core/src/client/constants';
import * as actions from 'loot-core/src/client/actions';
import { initialState as initialAppState } from 'loot-core/src/client/reducers/app';
import { handleGlobalEvents } from './client-global-events';
import App from './src/components/App';

function log() {
  return next => action => {
    console.log(action);
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
  applyMiddleware(thunk /* log */)
);
const boundActions = bindActionCreators(actions, store.dispatch);

// Listen for global events from the server or main process
handleGlobalEvents(boundActions, store);

export default function AppRoot() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}
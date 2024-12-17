// @ts-strict-ignore
// This file will initialize the app if we are in a real browser
// environment (not electron)
import './browser-preload';

import './fonts.scss';

import './i18n';

import React from 'react';
import { Provider } from 'react-redux';

import { bindActionCreators } from '@reduxjs/toolkit';
import { createRoot } from 'react-dom/client';

import * as actions from 'loot-core/src/client/actions';
import { runQuery } from 'loot-core/src/client/query-helpers';
import { store } from 'loot-core/src/client/store';
import { send } from 'loot-core/src/platform/client/fetch';
import { q } from 'loot-core/src/shared/query';

import { AuthProvider } from './auth/AuthProvider';
import { App } from './components/App';
import { ServerProvider } from './components/ServerContext';
import { handleGlobalEvents } from './global-events';
import { type BoundActions } from './hooks/useActions';

// See https://github.com/WICG/focus-visible. Only makes the blue
// focus outline appear from keyboard events.
import 'focus-visible';

const boundActions = bindActionCreators(
  actions,
  store.dispatch,
) as unknown as BoundActions;

// Listen for global events from the server or main process
handleGlobalEvents(boundActions, store);

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __actionsForMenu: BoundActions & { inputFocused: typeof inputFocused };

    $send: typeof send;
    $query: typeof runQuery;
    $q: typeof q;
  }
}

function inputFocused() {
  return (
    window.document.activeElement.tagName === 'INPUT' ||
    window.document.activeElement.tagName === 'TEXTAREA' ||
    (window.document.activeElement as HTMLElement).isContentEditable
  );
}

// Expose this to the main process to menu items can access it
window.__actionsForMenu = { ...boundActions, inputFocused };

// Expose send for fun!
window.$send = send;
window.$query = runQuery;
window.$q = q;

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <ServerProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ServerProvider>
  </Provider>,
);

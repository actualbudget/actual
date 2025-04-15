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

import * as prefsSlice from 'loot-core/client/prefs/prefsSlice';
import * as queriesSlice from 'loot-core/client/queries/queriesSlice';
import { aqlQuery } from 'loot-core/client/query-helpers';
import { store } from 'loot-core/client/store';
import { redo, undo } from 'loot-core/client/undo';
import * as usersSlice from 'loot-core/client/users/usersSlice';
import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';

import * as accountsSlice from './accounts/accountsSlice';
import * as appSlice from './app/appSlice';
import { AuthProvider } from './auth/AuthProvider';
import * as budgetsSlice from './budgets/budgetsSlice';
import * as modalsSlice from './modals/modalsSlice';
// See https://github.com/WICG/focus-visible. Only makes the blue
// focus outline appear from keyboard events.
import 'focus-visible';
import { App } from './components/App';
import { ServerProvider } from './components/ServerContext';
import * as modalsSlice from './modals/modalsSlice';
import * as notificationsSlice from './notifications/notificationsSlice';

const boundActions = bindActionCreators(
  {
    ...accountsSlice.actions,
    ...appSlice.actions,
    ...budgetsSlice.actions,
    ...modalsSlice.actions,
    ...notificationsSlice.actions,
    ...prefsSlice.actions,
    ...queriesSlice.actions,
    ...usersSlice.actions,
  },
  store.dispatch,
);

async function appFocused() {
  await send('app-focused');
}

async function uploadFile(filename: string, contents: ArrayBuffer) {
  send('upload-file-web', {
    filename,
    contents,
  });
}

function inputFocused() {
  return (
    window.document.activeElement.tagName === 'INPUT' ||
    window.document.activeElement.tagName === 'TEXTAREA' ||
    (window.document.activeElement as HTMLElement).isContentEditable
  );
}

// Expose this to the main process to menu items can access it
window.__actionsForMenu = {
  ...boundActions,
  undo,
  redo,
  appFocused,
  inputFocused,
  uploadFile,
};

// Expose send for fun!
window.$send = send;
window.$query = aqlQuery;
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

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __actionsForMenu: typeof boundActions & {
      undo: typeof undo;
      redo: typeof redo;
      appFocused: typeof appFocused;
      inputFocused: typeof inputFocused;
      uploadFile: typeof uploadFile;
    };

    $send: typeof send;
    $query: typeof aqlQuery;
    $q: typeof q;
  }
}

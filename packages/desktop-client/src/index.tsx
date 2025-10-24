// @ts-strict-ignore
// This file will initialize the app if we are in a real browser
// environment (not electron)
import './browser-preload';

import './fonts.scss';

import './i18n';

import React from 'react';
import { Provider } from 'react-redux';

import { bindActionCreators } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';

import * as accountsSlice from './accounts/accountsSlice';
import * as appSlice from './app/appSlice';
import { AuthProvider } from './auth/AuthProvider';
import * as budgetfilesSlice from './budgetfiles/budgetfilesSlice';
import { App } from './components/App';
import { ServerProvider } from './components/ServerContext';
import * as modalsSlice from './modals/modalsSlice';
import * as notificationsSlice from './notifications/notificationsSlice';
import * as payeesSlice from './payees/payeesSlice';
import * as prefsSlice from './prefs/prefsSlice';
import { aqlQuery } from './queries/aqlQuery';
import { store } from './redux/store';
import * as tagsSlice from './tags/tagsSlice';
import * as transactionsSlice from './transactions/transactionsSlice';
import { redo, undo } from './undo';
import * as usersSlice from './users/usersSlice';

const boundActions = bindActionCreators(
  {
    ...accountsSlice.actions,
    ...appSlice.actions,
    ...budgetfilesSlice.actions,
    ...modalsSlice.actions,
    ...notificationsSlice.actions,
    ...payeesSlice.actions,
    ...prefsSlice.actions,
    ...transactionsSlice.actions,
    ...tagsSlice.actions,
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

function inputFocused(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  return (
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.isContentEditable === true
  );
}

// Expose this to the main process to menu items can access it
window.__actionsForMenu = {
  ...boundActions,
  undo,
  redo,
  appFocused,
  uploadFile,
};

// Expose send for fun!
window.$send = send;
window.$query = aqlQuery;
window.$q = q;

const queryClient = new QueryClient();
window.__TANSTACK_QUERY_CLIENT__ = queryClient;

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <ServerProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
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
      uploadFile: typeof uploadFile;
    };

    $send: typeof send;
    $query: typeof aqlQuery;
    $q: typeof q;

    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey) {
    // Cmd/Ctrl+o
    if (e.key === 'o') {
      e.preventDefault();
      window.__actionsForMenu.closeBudget();
    }
    // Cmd/Ctrl+z
    else if (e.key.toLowerCase() === 'z') {
      if (inputFocused(e)) {
        return;
      }
      e.preventDefault();
      if (e.shiftKey) {
        // Redo
        window.__actionsForMenu.redo();
      } else {
        // Undo
        window.__actionsForMenu.undo();
      }
    }
  }
});

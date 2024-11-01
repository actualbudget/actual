// @ts-strict-ignore
import { send } from '../../platform/client/fetch';
import * as constants from '../constants';
import type {
  AppState,
  SetAppStateAction,
  SetLastUndoStateAction,
} from '../state-types/app';

import type { Dispatch } from './types';

export function setAppState(state: Partial<AppState>): SetAppStateAction {
  return {
    type: constants.SET_APP_STATE,
    state,
  };
}

export function updateApp() {
  return async (dispatch: Dispatch) => {
    global.Actual.applyAppUpdate();
    dispatch(setAppState({ updateInfo: null }));
  };
}

export function setLastUndoState(
  undoState: SetLastUndoStateAction['undoState'],
): SetLastUndoStateAction {
  return {
    type: constants.SET_LAST_UNDO_STATE,
    undoState,
  };
}

// This is only used in the fake web version where everything runs in
// the browser. It's a way to send a file to the backend to be
// imported into the virtual filesystem.
export function uploadFile(filename: string, contents: ArrayBuffer) {
  return () => {
    return send('upload-file-web', { filename, contents });
  };
}

export function focused() {
  return () => {
    return send('app-focused');
  };
}

export function reloadApp() {
  return () => {
    global.Actual.reload();
  };
}

const getPageDocs = (page: string) => {
  switch (page) {
    case '/budget':
      return 'https://actualbudget.org/docs/getting-started/envelope-budgeting';
    case '/reports':
      return 'https://actualbudget.org/docs/reports/';
    case '/schedules':
      return 'https://actualbudget.org/docs/schedules';
    case '/payees':
      return 'https://actualbudget.org/docs/transactions/payees';
    case '/rules':
      return 'https://actualbudget.org/docs/budgeting/rules';
    case '/settings':
      return 'https://actualbudget.org/docs/settings';
    default:
      // All pages under /accounts, plus any missing pages
      return 'https://actualbudget.org/docs';
  }
};

export function openDocsForCurrentPage() {
  return () => {
    global.Actual.openURLInBrowser(getPageDocs(window.location.pathname));
  };
}

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

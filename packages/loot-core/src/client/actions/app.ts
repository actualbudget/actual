import { send } from '../../platform/client/fetch';
import * as constants from '../constants';

export function setAppState(state) {
  return {
    type: constants.SET_APP_STATE,
    state,
  };
}

export function updateApp() {
  return async dispatch => {
    global.Actual.applyAppUpdate();
    dispatch(setAppState({ updateInfo: null }));
  };
}

export function setLastUndoState(undoState) {
  return {
    type: constants.SET_LAST_UNDO_STATE,
    undoState,
  };
}

// This is only used in the fake web version where everything runs in
// the browser. It's a way to send a file to the backend to be
// imported into the virtual filesystem.
export function uploadFile(filename: string, contents: ArrayBuffer) {
  return dispatch => {
    return send('upload-file-web', { filename, contents });
  };
}

export function focused() {
  return dispatch => {
    return send('app-focused');
  };
}

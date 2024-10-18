// @ts-strict-ignore
import { send } from 'loot-core/src/platform/client/fetch';
import { type UndoState } from 'loot-core/types/server-events';

import type { Dispatch } from '..';
import { type SplitState, type AppState } from '../app';
import * as constants from '../constants';

export type SetAppStateAction = {
  type: typeof constants.SET_APP_STATE;
  state: Partial<AppState>;
};

export type SetLastUndoStateAction = {
  type: typeof constants.SET_LAST_UNDO_STATE;
  undoState: UndoState | null;
};

export type SetLastSplitStateAction = {
  type: typeof constants.SET_LAST_SPLIT_STATE;
  splitState: SplitState | null;
};

export type AppActions =
  | SetAppStateAction
  | SetLastUndoStateAction
  | SetLastSplitStateAction;

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

import type { UndoState } from 'loot-core/src/types/server-events';

import type { AppActions } from './actions/app';
import * as constants from './constants';

export type SplitState = { ids: Set<string>; mode: 'collapse' | 'expand' };

export type AppState = {
  loadingText: string | null;
  updateInfo: {
    version: string;
    releaseDate: string;
    releaseNotes: string;
  } | null;
  showUpdateNotification: boolean;
  managerHasInitialized: boolean;
  lastUndoState: { current: UndoState | null };
  lastSplitState: { current: SplitState | null };
};

export const initialState: AppState = {
  loadingText: null,
  updateInfo: null,
  showUpdateNotification: true,
  managerHasInitialized: false,
  lastUndoState: { current: null },
  lastSplitState: { current: null },
};

export function update(state = initialState, action: AppActions): AppState {
  switch (action.type) {
    case constants.SET_APP_STATE:
      return {
        ...state,
        ...action.state,
      };
    case constants.SET_LAST_UNDO_STATE:
      // Intentionally mutate it. Components should never rerender
      // looking at this, so we put it in a "box" like a ref. They
      // only ever need to look at this on mount.
      state.lastUndoState.current = action.undoState;
      return state;

    case constants.SET_LAST_SPLIT_STATE:
      state.lastSplitState.current = action.splitState;
      return state;

    default:
  }
  return state;
}

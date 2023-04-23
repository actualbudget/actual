import * as constants from '../constants';

export const initialState = {
  loadingText: null,
  updateInfo: null,
  showUpdateNotification: true,
  managerHasInitialized: false,
  lastUndoState: { current: null },
  lastSplitState: { current: null },
};

export default function update(state = initialState, action) {
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

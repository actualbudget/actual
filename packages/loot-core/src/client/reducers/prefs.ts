// @ts-strict-ignore
import * as constants from '../constants';
import type { Action } from '../state-types';
import type { PrefsState } from '../state-types/prefs';

const initialState: PrefsState = {
  local: null,
  global: null,
};

export function update(state = initialState, action: Action): PrefsState {
  switch (action.type) {
    case constants.SET_PREFS:
      return { local: action.prefs, global: action.globalPrefs };
    case constants.MERGE_LOCAL_PREFS:
      return {
        ...state,
        local: { ...state.local, ...action.prefs },
      };
    case constants.MERGE_GLOBAL_PREFS:
      return {
        ...state,
        global: { ...state.global, ...action.globalPrefs },
      };

    default:
  }
  return state;
}

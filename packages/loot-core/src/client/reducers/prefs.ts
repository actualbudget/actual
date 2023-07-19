import { setNumberFormat } from '../../shared/util';
import * as constants from '../constants';
import type { Action } from '../state-types';
import type { PrefsState } from '../state-types/prefs';

const initialState: PrefsState = {
  local: null,
  global: null,
};

export default function update(
  state = initialState,
  action: Action,
): PrefsState {
  switch (action.type) {
    case constants.SET_PREFS:
      if (action.prefs) {
        setNumberFormat({
          format: action.prefs.numberFormat || 'comma-dot',
          hideFraction: action.prefs.hideFraction,
        });
      }
      return { local: action.prefs, global: action.globalPrefs };
    case constants.MERGE_LOCAL_PREFS:
      if (action.prefs.numberFormat || action.prefs.hideFraction != null) {
        setNumberFormat({
          format: action.prefs.numberFormat || state.local.numberFormat,
          hideFraction:
            action.prefs.hideFraction != null
              ? action.prefs.hideFraction
              : state.local.hideFraction,
        });
      }

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

// @ts-strict-ignore
import { isNumberFormat, setNumberFormat } from '../../shared/util';
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
      if (action.prefs) {
        setNumberFormat({
          format: isNumberFormat(action.prefs.numberFormat)
            ? action.prefs.numberFormat
            : 'comma-dot',
          hideFraction: String(action.prefs.hideFraction) === 'true',
        });
      }
      return { local: action.prefs, global: action.globalPrefs };
    case constants.MERGE_LOCAL_PREFS:
      if (action.prefs.numberFormat || action.prefs.hideFraction != null) {
        setNumberFormat({
          format: isNumberFormat(action.prefs.numberFormat)
            ? action.prefs.numberFormat
            : isNumberFormat(state.local.numberFormat)
              ? state.local.numberFormat
              : 'comma-dot',
          hideFraction:
            String(
              action.prefs.hideFraction != null
                ? action.prefs.hideFraction
                : state.local.hideFraction,
            ) === 'true',
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

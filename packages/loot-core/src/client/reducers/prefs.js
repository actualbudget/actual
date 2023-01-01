import { setNumberFormat } from '../../shared/util.js';
import constants from '../constants';

const initialState = {
  local: null,
  global: null
};

export default function update(state = initialState, action) {
  switch (action.type) {
    case constants.SET_PREFS:
      if (action.prefs) {
        setNumberFormat(action.prefs.numberFormat || 'comma-dot');
      }
      return { local: action.prefs, global: action.globalPrefs };
    case constants.MERGE_LOCAL_PREFS:
      if (action.prefs.numberFormat) {
        setNumberFormat(action.prefs.numberFormat);
      }

      return {
        ...state,
        local: { ...state.local, ...action.prefs }
      };
    case constants.MERGE_GLOBAL_PREFS:
      return {
        ...state,
        global: { ...state.global, ...action.globalPrefs }
      };

    default:
  }
  return state;
}

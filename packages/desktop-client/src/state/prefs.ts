import {
  type GlobalPrefs,
  type MetadataPrefs,
  type SyncedPrefs,
} from 'loot-core/types/prefs';

import type { PrefsActions } from './actions/prefs';
import * as constants from './constants';

export type PrefsState = {
  local: MetadataPrefs;
  global: GlobalPrefs;
  synced: SyncedPrefs;
};

const initialState: PrefsState = {
  local: {},
  global: {},
  synced: {},
};

export function update(state = initialState, action: PrefsActions): PrefsState {
  switch (action.type) {
    case constants.SET_PREFS:
      return {
        ...state,
        local: action.prefs,
        global: action.globalPrefs,
        synced: action.syncedPrefs,
      };
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
    case constants.MERGE_SYNCED_PREFS:
      return {
        ...state,
        synced: { ...state.synced, ...action.syncedPrefs },
      };

    default:
  }
  return state;
}

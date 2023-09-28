import type { LocalPrefs, GlobalPrefs } from '../../types/prefs';
import type * as constants from '../constants';

export type PrefsState = {
  local: LocalPrefs | null;
  global: GlobalPrefs | null;
};

export type SetPrefsAction = {
  type: typeof constants.SET_PREFS;
  prefs: LocalPrefs;
  globalPrefs: GlobalPrefs;
};

export type MergeLocalPrefsAction = {
  type: typeof constants.MERGE_LOCAL_PREFS;
  prefs: LocalPrefs;
};

export type MergeGlobalPrefsAction = {
  type: typeof constants.MERGE_GLOBAL_PREFS;
  globalPrefs: GlobalPrefs;
};

export type PrefsActions =
  | SetPrefsAction
  | MergeLocalPrefsAction
  | MergeGlobalPrefsAction;

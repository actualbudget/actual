import type { GlobalPrefs, MetadataPrefs } from '../../types/prefs';
import type * as constants from '../constants';

export type PrefsState = {
  local: MetadataPrefs;
  global: GlobalPrefs;
};

export type SetPrefsAction = {
  type: typeof constants.SET_PREFS;
  prefs: MetadataPrefs;
  globalPrefs: GlobalPrefs;
};

export type MergeLocalPrefsAction = {
  type: typeof constants.MERGE_LOCAL_PREFS;
  prefs: MetadataPrefs;
};

export type MergeGlobalPrefsAction = {
  type: typeof constants.MERGE_GLOBAL_PREFS;
  globalPrefs: GlobalPrefs;
};

export type PrefsActions =
  | SetPrefsAction
  | MergeLocalPrefsAction
  | MergeGlobalPrefsAction;

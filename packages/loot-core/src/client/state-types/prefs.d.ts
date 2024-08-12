import type {
  GlobalPrefs,
  LocalPrefs,
  MetadataPrefs,
  SyncedPrefs,
} from '../../types/prefs';
import type * as constants from '../constants';

export type PrefsState = {
  local: LocalPrefs & MetadataPrefs & SyncedPrefs;
  global: GlobalPrefs;
};

export type SetPrefsAction = {
  type: typeof constants.SET_PREFS;
  prefs: LocalPrefs & MetadataPrefs & SyncedPrefs;
  globalPrefs: GlobalPrefs;
};

export type MergeLocalPrefsAction = {
  type: typeof constants.MERGE_LOCAL_PREFS;
  prefs: LocalPrefs & MetadataPrefs & SyncedPrefs;
};

export type MergeGlobalPrefsAction = {
  type: typeof constants.MERGE_GLOBAL_PREFS;
  globalPrefs: GlobalPrefs;
};

export type PrefsActions =
  | SetPrefsAction
  | MergeLocalPrefsAction
  | MergeGlobalPrefsAction;

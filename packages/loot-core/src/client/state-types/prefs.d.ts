import type {
  GlobalPrefs,
  MetadataPrefs,
  SyncedPrefs,
} from '../../types/prefs';
import type * as constants from '../constants';

export type PrefsState = {
  local: MetadataPrefs;
  global: GlobalPrefs;
  synced: SyncedPrefs;
};

export type SetPrefsAction = {
  type: typeof constants.SET_PREFS;
  prefs: MetadataPrefs;
  globalPrefs: GlobalPrefs;
  syncedPrefs: SyncedPrefs;
};

export type MergeLocalPrefsAction = {
  type: typeof constants.MERGE_LOCAL_PREFS;
  prefs: MetadataPrefs;
};

export type MergeGlobalPrefsAction = {
  type: typeof constants.MERGE_GLOBAL_PREFS;
  globalPrefs: GlobalPrefs;
};

export type MergeSyncedPrefsAction = {
  type: typeof constants.MERGE_SYNCED_PREFS;
  syncedPrefs: SyncedPrefs;
};

export type PrefsActions =
  | SetPrefsAction
  | MergeLocalPrefsAction
  | MergeGlobalPrefsAction
  | MergeSyncedPrefsAction;

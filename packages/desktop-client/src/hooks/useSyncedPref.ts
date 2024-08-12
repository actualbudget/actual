import { type SyncedPrefs } from 'loot-core/src/types/prefs';

import { useLocalPref } from './useLocalPref';

type SetSyncedPrefAction<K extends keyof SyncedPrefs> = (
  value: SyncedPrefs[K],
) => void;

export function useSyncedPref<K extends keyof SyncedPrefs>(
  prefName: K,
): [SyncedPrefs[K], SetSyncedPrefAction<K>] {
  // TODO: implement logic for fetching the pref exclusively from the
  // database (in follow-up PR)
  return useLocalPref(prefName);
}

import { useQuery } from '@tanstack/react-query';

import type { SyncedPrefs } from 'loot-core/types/prefs';

import { prefQueries, useSaveSyncedPrefsMutation } from '@desktop-client/prefs';

type SetSyncedPrefsAction = (value: Partial<SyncedPrefs>) => void;

/** @deprecated: please use `useSyncedPref` (singular) */
export function useSyncedPrefs(): [SyncedPrefs, SetSyncedPrefsAction] {
  const saveSyncedPrefsMutation = useSaveSyncedPrefsMutation();
  const saveSyncedPrefs: SetSyncedPrefsAction = newValue => {
    saveSyncedPrefsMutation.mutate(newValue);
  };
  const syncedPrefsQuery = useQuery(prefQueries.listSynced());

  return [syncedPrefsQuery.data as SyncedPrefs, saveSyncedPrefs];
}

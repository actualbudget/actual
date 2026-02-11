import { useQuery } from '@tanstack/react-query';

import type { SyncedPrefs } from 'loot-core/types/prefs';

import { prefQueries, useSaveSyncedPrefsMutation } from '@desktop-client/prefs';

type SetSyncedPrefAction<K extends keyof SyncedPrefs> = (
  value: SyncedPrefs[K],
) => void;

export function useSyncedPref<K extends keyof SyncedPrefs>(
  prefName: K,
): [SyncedPrefs[K], SetSyncedPrefAction<K>] {
  const saveSyncedPrefsMutation = useSaveSyncedPrefsMutation();
  const saveSyncedPref: SetSyncedPrefAction<K> = value => {
    saveSyncedPrefsMutation.mutate({ [prefName]: value });
  };

  const syncedPrefsQuery = useQuery({
    ...prefQueries.listSynced(),
    select: prefs => prefs?.[prefName],
    enabled: !!prefName,
    notifyOnChangeProps: ['data'],
  });

  return [syncedPrefsQuery.data as SyncedPrefs[K], saveSyncedPref];
}

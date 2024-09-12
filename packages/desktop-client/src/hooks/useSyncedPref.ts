import { useCallback } from 'react';

import { useQuery } from 'loot-core/client/query-hooks';
import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import { type SyncedPrefs } from 'loot-core/src/types/prefs';

type SetSyncedPrefAction<K extends keyof SyncedPrefs> = (
  value: SyncedPrefs[K],
) => void;

export function useSyncedPref<K extends keyof SyncedPrefs>(
  prefName: K,
): [SyncedPrefs[K], SetSyncedPrefAction<K>] {
  const { data: queryData, overrideData: setQueryData } = useQuery<
    [{ value: string | undefined }]
  >(
    () => q('preferences').filter({ id: prefName }).select('value'),
    [prefName],
  );

  const setLocalPref = useCallback<SetSyncedPrefAction<K>>(
    newValue => {
      const value = String(newValue);
      setQueryData([{ value }]);
      send('preferences/save', { id: prefName, value });
    },
    [prefName, setQueryData],
  );

  return [queryData?.[0]?.value, setLocalPref];
}

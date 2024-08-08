import { useCallback, useEffect, useState } from 'react';

import { useLiveQuery } from 'loot-core/client/query-hooks';
import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import { type SyncedBudgetPrefs } from 'loot-core/src/types/prefs';

type SetSyncedBudgetPrefAction<K extends keyof SyncedBudgetPrefs> = (
  value: SyncedBudgetPrefs[K],
) => void;

/**
 * Synced budget preferences are stored in the local sqlite database.
 * They are synced across devices (if the user is using actual-server).
 */
export function useSyncedBudgetPref<K extends keyof SyncedBudgetPrefs>(
  prefName: K,
): [SyncedBudgetPrefs[K], SetSyncedBudgetPrefAction<K>] {
  const queryData = useLiveQuery<[{ value: SyncedBudgetPrefs[K] }]>(
    () => q('preferences').filter({ id: prefName }).select('value'),
    [prefName],
  );
  const queryValue = queryData?.[0]?.value;
  const [data, setOptimisticData] = useState<
    SyncedBudgetPrefs[K] | undefined
  >();

  // When initial query loads - load it in memory if
  // there is not already something there
  useEffect(() => {
    setOptimisticData(state => state || queryValue);
  }, [queryValue]);

  const setLocalPref = useCallback<SetSyncedBudgetPrefAction<K>>(
    value => {
      setOptimisticData(value);
      send('preferences-save', { id: prefName, value });
    },
    [prefName],
  );

  return [data, setLocalPref];
}

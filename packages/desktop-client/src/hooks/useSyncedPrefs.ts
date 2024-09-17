import { useCallback, useMemo } from 'react';

import { useQuery } from 'loot-core/client/query-hooks';
import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import { type SyncedPrefs } from 'loot-core/src/types/prefs';

type SetSyncedPrefsAction = (value: Partial<SyncedPrefs>) => void;

/** @deprecated: please use `useSyncedPref` (singular) */
export function useSyncedPrefs(): [SyncedPrefs, SetSyncedPrefsAction] {
  const { data: queryData } = useQuery<{ id: string; value: string }[]>(
    () => q('preferences').select(['id', 'value']),
    [],
  );

  const prefs = useMemo<SyncedPrefs>(
    () =>
      queryData.reduce(
        (carry, { id, value }) => ({
          ...carry,
          [id]: value,
        }),
        {},
      ),
    [queryData],
  );

  const setPrefs = useCallback<SetSyncedPrefsAction>(newValue => {
    Object.entries(newValue).forEach(([id, value]) => {
      send('preferences/save', {
        id: id as keyof SyncedPrefs,
        value: String(value),
      });
    });
  }, []);

  return [prefs, setPrefs];
}

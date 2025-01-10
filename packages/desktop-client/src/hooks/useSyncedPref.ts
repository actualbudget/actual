import { useCallback } from 'react';

import { saveSyncedPrefs } from 'loot-core/client/actions';
import { type SyncedPrefs } from 'loot-core/src/types/prefs';

import { useAppSelector, useAppDispatch } from '../redux';

type SetSyncedPrefAction<K extends keyof SyncedPrefs> = (
  value: SyncedPrefs[K],
) => void;

export function useSyncedPref<K extends keyof SyncedPrefs>(
  prefName: K,
): [SyncedPrefs[K], SetSyncedPrefAction<K>] {
  const dispatch = useAppDispatch();
  const setPref = useCallback<SetSyncedPrefAction<K>>(
    value => {
      dispatch(saveSyncedPrefs({ [prefName]: value }));
    },
    [prefName, dispatch],
  );
  const pref = useAppSelector(state => state.prefs.synced[prefName]);

  return [pref, setPref];
}

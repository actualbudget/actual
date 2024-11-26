import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type SyncedPrefs } from 'loot-core-shared/types/prefs';

import { saveSyncedPrefs } from 'loot-core/client/actions';
import { type State } from 'loot-core/client/state-types';

type SetSyncedPrefAction<K extends keyof SyncedPrefs> = (
  value: SyncedPrefs[K],
) => void;

export function useSyncedPref<K extends keyof SyncedPrefs>(
  prefName: K,
): [SyncedPrefs[K], SetSyncedPrefAction<K>] {
  const dispatch = useDispatch();
  const setPref = useCallback<SetSyncedPrefAction<K>>(
    value => {
      dispatch(saveSyncedPrefs({ [prefName]: value }));
    },
    [prefName, dispatch],
  );
  const pref = useSelector((state: State) => state.prefs.synced[prefName]);

  return [pref, setPref];
}

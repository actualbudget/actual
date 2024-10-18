import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type SyncedPrefs } from 'loot-core/src/types/prefs';

import { type State } from '../state';
import { saveSyncedPrefs } from '../state/actions';

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

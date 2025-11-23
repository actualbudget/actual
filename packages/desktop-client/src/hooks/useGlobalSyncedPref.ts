import { useCallback } from 'react';

import { type GlobalSyncedPrefs } from 'loot-core/types/prefs';

import { saveGlobalSyncedPrefs } from '@desktop-client/globalSyncedPrefs/globalSyncedPrefsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

type SetGlobalSyncedPrefAction<K extends keyof GlobalSyncedPrefs> = (
  value: GlobalSyncedPrefs[K],
) => void;

export function useGlobalSyncedPref<K extends keyof GlobalSyncedPrefs>(
  prefName: K,
): [GlobalSyncedPrefs[K], SetGlobalSyncedPrefAction<K>] {
  const dispatch = useDispatch();

  const setPref = useCallback<SetGlobalSyncedPrefAction<K>>(
    value => {
      dispatch(
        saveGlobalSyncedPrefs({
          prefs: { [prefName]: value },
        }),
      );
    },
    [dispatch, prefName],
  );

  const pref = useSelector(state => state.globalSyncedPrefs[prefName]);

  return [pref, setPref];
}

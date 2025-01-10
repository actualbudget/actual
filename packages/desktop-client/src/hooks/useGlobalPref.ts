import { useCallback } from 'react';

import { saveGlobalPrefs } from 'loot-core/client/prefs/prefsSlice';
import { type GlobalPrefs } from 'loot-core/src/types/prefs';

import { useSelector, useDispatch } from '../redux';

type SetGlobalPrefAction<K extends keyof GlobalPrefs> = (
  value: GlobalPrefs[K],
) => void;

export function useGlobalPref<K extends keyof GlobalPrefs>(
  prefName: K,
  onSaveGlobalPrefs?: () => void,
): [GlobalPrefs[K], SetGlobalPrefAction<K>] {
  const dispatch = useDispatch();
  const setGlobalPref = useCallback<SetGlobalPrefAction<K>>(
    value => {
      dispatch(
        saveGlobalPrefs({
          prefs: {
            [prefName]: value,
          },
          onSaveGlobalPrefs,
        }),
      );
    },
    [prefName, dispatch, onSaveGlobalPrefs],
  );
  const globalPref = useSelector(
    state => state.prefs.global?.[prefName] as GlobalPrefs[K],
  );

  return [globalPref, setGlobalPref];
}

import { useCallback } from 'react';

import { saveGlobalPrefs } from 'loot-core/src/client/actions';
import { type GlobalPrefs } from 'loot-core/src/types/prefs';

import { useAppSelector, useAppDispatch } from '../redux';

type SetGlobalPrefAction<K extends keyof GlobalPrefs> = (
  value: GlobalPrefs[K],
) => void;

export function useGlobalPref<K extends keyof GlobalPrefs>(
  prefName: K,
  onSaveGlobalPrefs?: () => void,
): [GlobalPrefs[K], SetGlobalPrefAction<K>] {
  const dispatch = useAppDispatch();
  const setGlobalPref = useCallback<SetGlobalPrefAction<K>>(
    value => {
      dispatch(
        saveGlobalPrefs(
          {
            [prefName]: value,
          } as GlobalPrefs,
          onSaveGlobalPrefs,
        ),
      );
    },
    [prefName, dispatch, onSaveGlobalPrefs],
  );
  const globalPref = useAppSelector(
    state => state.prefs.global?.[prefName] as GlobalPrefs[K],
  );

  return [globalPref, setGlobalPref];
}

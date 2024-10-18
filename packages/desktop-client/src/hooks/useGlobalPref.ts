import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type GlobalPrefs } from 'loot-core/src/types/prefs';

import { type State } from '../state';
import { saveGlobalPrefs } from '../state/actions';

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
  const globalPref = useSelector(
    (state: State) => state.prefs.global?.[prefName] as GlobalPrefs[K],
  );

  return [globalPref, setGlobalPref];
}

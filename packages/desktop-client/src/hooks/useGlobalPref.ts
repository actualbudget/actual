import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { saveGlobalPrefs } from 'loot-core/src/client/actions';
import { type State } from 'loot-core/src/client/state-types';
import { type GlobalPrefs } from 'loot-core/src/types/prefs';

export function useGlobalPref<K extends keyof GlobalPrefs>(
  prefName: K,
  defaultValue?: GlobalPrefs[K],
): [GlobalPrefs[K], (value: GlobalPrefs[K]) => void] {
  const dispatch = useDispatch();
  const setGlobalPref = useCallback(
    (value: GlobalPrefs[K]) => {
      dispatch(saveGlobalPrefs({ [prefName]: value }));
    },
    [prefName, dispatch],
  );
  const globalPref =
    useSelector((state: State) => state.prefs.global?.[prefName]) ||
    defaultValue;
  return [globalPref, setGlobalPref];
}

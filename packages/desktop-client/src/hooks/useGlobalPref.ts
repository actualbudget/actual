import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { saveGlobalPrefs } from 'loot-core/src/client/actions';
import { type State } from 'loot-core/src/client/state-types';
import { type GlobalPrefs } from 'loot-core/src/types/prefs';

type SetGlobalPrefAction<K extends keyof GlobalPrefs> = (
  value: GlobalPrefs[K],
) => void;

export function useGlobalPref<K extends keyof GlobalPrefs>(
  prefName: K,
): [GlobalPrefs[K], SetGlobalPrefAction<K>] {
  const dispatch = useDispatch();
  const setGlobalPref = useCallback<SetGlobalPrefAction<K>>(
    value => {
      debugger;
      dispatch(saveGlobalPrefs({ [prefName]: value } as GlobalPrefs));
    },
    [prefName, dispatch],
  );
  const globalPref = useSelector(
    (state: State) => state.prefs.global?.[prefName] as GlobalPrefs[K],
  );

  return [globalPref, setGlobalPref];
}

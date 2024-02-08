import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { savePrefs } from 'loot-core/src/client/actions';
import { type State } from 'loot-core/src/client/state-types';
import { type LocalPrefs } from 'loot-core/src/types/prefs';

type SetLocalPrefAction<K extends keyof LocalPrefs> = (
  value: LocalPrefs[K],
) => void;

export function useLocalPref<K extends keyof LocalPrefs>(
  prefName: K,
  defaultValue?: LocalPrefs[K],
): [LocalPrefs[K], SetLocalPrefAction<K>] {
  const dispatch = useDispatch();
  const setLocalPref: SetLocalPrefAction<K> = useCallback(
    value => {
      dispatch(savePrefs({ [prefName]: value }));
    },
    [prefName, dispatch],
  );
  const localPref =
    useSelector((state: State) => state.prefs.local?.[prefName]) ||
    defaultValue;
  return [localPref, setLocalPref];
}

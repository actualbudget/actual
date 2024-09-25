import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { savePrefs } from 'loot-core/client/actions';
import { type State } from 'loot-core/client/state-types';
import { type MetadataPrefs } from 'loot-core/types/prefs';

type SetMetadataPrefAction<K extends keyof MetadataPrefs> = (
  value: MetadataPrefs[K],
) => void;

export function useMetadataPref<K extends keyof MetadataPrefs>(
  prefName: K,
): [MetadataPrefs[K], SetMetadataPrefAction<K>] {
  const dispatch = useDispatch();
  const setLocalPref = useCallback<SetMetadataPrefAction<K>>(
    value => {
      dispatch(savePrefs({ [prefName]: value }));
    },
    [prefName, dispatch],
  );
  const localPref = useSelector(
    (state: State) => state.prefs.local?.[prefName],
  );

  return [localPref, setLocalPref];
}

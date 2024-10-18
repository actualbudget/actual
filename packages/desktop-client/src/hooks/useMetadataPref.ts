import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type MetadataPrefs } from 'loot-core/types/prefs';

import { type State } from '../state';
import { savePrefs } from '../state/actions';

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

import { useQuery } from '@tanstack/react-query';

import type { GlobalPrefs } from 'loot-core/types/prefs';

import { prefQueries, useSaveGlobalPrefsMutation } from '@desktop-client/prefs';

type SetGlobalPrefAction<K extends keyof GlobalPrefs> = (
  value: GlobalPrefs[K],
) => void;

export function useGlobalPref<K extends keyof GlobalPrefs>(
  prefName: K,
  onSaveGlobalPrefs?: () => void,
): [GlobalPrefs[K], SetGlobalPrefAction<K>] {
  const saveGlobalPrefsMutation = useSaveGlobalPrefsMutation();
  const saveGlobalPref: SetGlobalPrefAction<K> = value => {
    saveGlobalPrefsMutation.mutate(
      {
        [prefName]: value,
      },
      {
        onSuccess: onSaveGlobalPrefs,
      },
    );
  };

  const globalPrefsQuery = useQuery({
    ...prefQueries.listGlobal(),
    select: prefs => prefs?.[prefName],
    enabled: !!prefName,
    notifyOnChangeProps: ['data'],
  });

  return [globalPrefsQuery.data as GlobalPrefs[K], saveGlobalPref];
}

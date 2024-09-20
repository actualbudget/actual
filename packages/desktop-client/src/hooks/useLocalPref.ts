import { useEffect } from 'react';

import { useLocalStorage } from 'usehooks-ts';

import { type LocalPrefs } from 'loot-core/src/types/prefs';

import { useMetadataPref } from './useMetadataPref';

type SetLocalPrefAction<K extends keyof LocalPrefs> = (
  value: LocalPrefs[K],
) => void;

/**
 * Local preferences are scoped to a specific budget file.
 */
export function useLocalPref<K extends keyof LocalPrefs>(
  prefName: K,
): [LocalPrefs[K], SetLocalPrefAction<K>] {
  const [budgetId] = useMetadataPref('id');

  const [value, setValue] = useLocalStorage<LocalPrefs[K]>(
    `${budgetId}-${prefName}`,
    undefined,
    {
      deserializer: JSON.parse,
      serializer: JSON.stringify,
    },
  );

  // Migrate from old pref storage location (metadata.json) to local storage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [metadataPref] = useMetadataPref(prefName as any);
  useEffect(() => {
    if (value !== undefined || metadataPref === undefined) {
      return;
    }

    setValue(metadataPref);
  }, [value, metadataPref, setValue]);

  return [value, setValue];
}

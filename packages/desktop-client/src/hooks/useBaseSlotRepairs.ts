import { send } from '@actual-app/core/platform/client/connection';
import { useQuery } from '@tanstack/react-query';

import { useMetadataPref } from './useMetadataPref';
import { useMulticurrencyAvailable } from './useMulticurrencyAvailable';
import { useSyncedPref } from './useSyncedPref';

const none = new Set<string>();

/**
 * The categories that display repairable base history (MC-10.6), for the
 * category menus' base lanes entry. A local read under the pocket reads'
 * key, so the same lane and slot changes refresh it, and it runs offline.
 */
export function useBaseSlotRepairs(): Set<string> {
  const [budgetId] = useMetadataPref('id');
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const available = useMulticurrencyAvailable();
  const { data } = useQuery({
    queryKey: ['budget', 'category-pockets', 'base-slot-categories', budgetId],
    queryFn: async () =>
      new Set(await send('budget/base-slot-categories', undefined)),
    enabled: !!budgetId && available && budgetType === 'envelope',
    networkMode: 'always',
  });
  return data ?? none;
}

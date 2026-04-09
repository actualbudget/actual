import { useQuery } from '@tanstack/react-query';

import { payeeQueries } from '#payees';

import { useLocationPermission } from './useLocationPermission';

export function useNearbyPayees() {
  const locationAccess = useLocationPermission();

  return useQuery({
    ...payeeQueries.listNearby(),
    enabled: !!locationAccess,
  });
}

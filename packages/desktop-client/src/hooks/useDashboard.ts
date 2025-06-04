import { useMemo } from 'react';

import { q } from 'loot-core/shared/query';
import { type Widget } from 'loot-core/types/models';

import { useQuery } from './useQuery';

export function useDashboard() {
  const { data: queryData, isLoading } = useQuery<Widget>(
    () => q('dashboard').select('*'),
    [],
  );

  return useMemo(
    () => ({
      isLoading,
      data: queryData || [],
    }),
    [isLoading, queryData],
  );
}

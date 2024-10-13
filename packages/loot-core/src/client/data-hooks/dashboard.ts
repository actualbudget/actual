import { useMemo } from 'react';

import { q } from '../../shared/query';
import { type Widget } from '../../types/models';
import { useQuery } from '../query-hooks';

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

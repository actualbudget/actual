import { useMemo } from 'react';

import { q } from '../../shared/query';
import { type Widget } from '../../types/models';
import { useLiveQuery } from '../query-hooks';

export function useDashboard() {
  const queryData = useLiveQuery<Widget[]>(
    () => q('dashboard').select('*'),
    [],
  );

  return useMemo(
    () => ({
      isLoading: queryData === null,
      data: queryData || [],
    }),
    [queryData],
  );
}

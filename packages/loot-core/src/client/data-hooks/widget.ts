import { useMemo } from 'react';

import { q } from '../../shared/query';
import { type Widget } from '../../types/models';
import { useLiveQuery } from '../query-hooks';

export function useWidget(id: string) {
  const data = useLiveQuery<Widget[]>(
    () => q('dashboard').filter({ id }).select('*'),
    [id],
  );

  return useMemo(
    () => ({
      isLoading: data === null,
      data: data?.[0],
    }),
    [data],
  );
}

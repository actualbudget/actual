import { useMemo } from 'react';

import { q } from '../../shared/query';
import { type Widget } from '../../types/models';
import { useLiveQuery } from '../query-hooks';

export function useWidget<W extends Widget>(id: string, type: W['type']) {
  const data = useLiveQuery<W[]>(
    () => q('dashboard').filter({ id, type }).select('*'),
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

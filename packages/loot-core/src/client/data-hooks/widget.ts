import { useMemo } from 'react';

import { q } from '../../shared/query';
import { type Widget } from '../../types/models';
import { useQuery } from '../query-hooks';

export function useWidget<W extends Widget>(id: W['id'], type: W['type']) {
  const { data = [], isLoading } = useQuery<W>(
    () => q('dashboard').filter({ id, type }).select('*'),
    [id, type],
  );

  return useMemo(
    () => ({
      isLoading,
      data: data?.[0],
    }),
    [data, isLoading],
  );
}

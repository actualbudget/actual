import { useMemo } from 'react';

import { q } from 'loot-core/shared/query';
import { type Widget } from 'loot-core/types/models';

import { useQuery } from './useQuery';

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
